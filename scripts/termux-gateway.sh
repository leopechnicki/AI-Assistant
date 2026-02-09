#!/data/data/com.termux/files/usr/bin/bash
# Hex Gateway Runner for Termux
# Manages the gateway process with Android-specific optimizations.
#
# Usage:
#   termux-gateway.sh start     Start gateway (with wakelock)
#   termux-gateway.sh stop      Stop gateway (release wakelock)
#   termux-gateway.sh status    Show gateway status
#   termux-gateway.sh restart   Restart gateway
#   termux-gateway.sh logs      Tail gateway logs
#
# Place in ~/.shortcuts/ for Termux:Widget one-tap start.

set -uo pipefail

HEX_DIR="$HOME/.hex"
PID_FILE="$HEX_DIR/termux-gateway.pid"
LOG_FILE="$HEX_DIR/termux-gateway.log"
ENV_FILE="$HEX_DIR/.env"

# --- Helpers ----------------------------------------------------------------

toast() {
    if command -v termux-toast &>/dev/null; then
        termux-toast "$1"
    fi
    echo "$1"
}

is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        # Stale PID file
        rm -f "$PID_FILE"
    fi
    return 1
}

get_pid() {
    cat "$PID_FILE" 2>/dev/null || echo ""
}

# --- Environment setup (lightweight, skip heavy features) -------------------

setup_env() {
    # Skip features that are heavy or irrelevant on a phone
    export HEX_SKIP_BROWSER_CONTROL_SERVER=1
    export HEX_SKIP_CANVAS_HOST=1
    export HEX_SKIP_GMAIL_WATCHER=1

    # Memory management: limit Node.js heap
    # Galaxy S10 has 6-8GB but Android uses a lot; 1.5GB is safe
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"

    # Load .env if present (TELEGRAM_BOT_TOKEN, OLLAMA_API_KEY, etc.)
    if [ -f "$ENV_FILE" ]; then
        set -a
        # shellcheck disable=SC1090
        source "$ENV_FILE"
        set +a
    fi
}

# --- Commands ---------------------------------------------------------------

cmd_start() {
    if is_running; then
        local pid
        pid=$(get_pid)
        toast "Gateway already running (PID $pid)"
        return 0
    fi

    echo "==> Starting Hex Gateway..."
    setup_env

    # Acquire Termux wakelock (prevents Android from killing us)
    if command -v termux-wake-lock &>/dev/null; then
        termux-wake-lock
        echo "  Wakelock acquired"
    fi

    # Start gateway in background
    nohup hex gateway run \
        --bind loopback \
        --port 18789 \
        --force \
        --allow-unconfigured \
        > "$LOG_FILE" 2>&1 &

    local pid=$!
    echo "$pid" > "$PID_FILE"

    # Wait a moment and check it started
    sleep 3
    if kill -0 "$pid" 2>/dev/null; then
        toast "Gateway started (PID $pid)"
        echo "  Logs: $LOG_FILE"
    else
        rm -f "$PID_FILE"
        toast "Gateway failed to start"
        echo "  Check logs: cat $LOG_FILE"
        # Release wakelock on failure
        if command -v termux-wake-unlock &>/dev/null; then
            termux-wake-unlock
        fi
        return 1
    fi
}

cmd_stop() {
    if ! is_running; then
        toast "Gateway is not running"
        return 0
    fi

    local pid
    pid=$(get_pid)
    echo "==> Stopping gateway (PID $pid)..."

    kill "$pid" 2>/dev/null
    # Give it 5 seconds for graceful shutdown
    local wait=0
    while kill -0 "$pid" 2>/dev/null && [ "$wait" -lt 5 ]; do
        sleep 1
        wait=$((wait + 1))
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null
    fi

    rm -f "$PID_FILE"

    # Release Termux wakelock
    if command -v termux-wake-unlock &>/dev/null; then
        termux-wake-unlock
        echo "  Wakelock released"
    fi

    toast "Gateway stopped"
}

cmd_status() {
    echo ""
    echo "  Hex Gateway Status"
    echo "  ==================="

    if is_running; then
        local pid
        pid=$(get_pid)
        echo "  State:   RUNNING (PID $pid)"

        # Memory usage (RSS in MB)
        local rss_kb
        rss_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
        local rss_mb=$(( rss_kb / 1024 ))
        echo "  Memory:  ${rss_mb} MB"

        # Uptime
        local start_time
        start_time=$(stat -c %Y "$PID_FILE" 2>/dev/null || echo "0")
        local now
        now=$(date +%s)
        local uptime=$(( now - start_time ))
        local hours=$(( uptime / 3600 ))
        local mins=$(( (uptime % 3600) / 60 ))
        echo "  Uptime:  ${hours}h ${mins}m"
    else
        echo "  State:   STOPPED"
    fi

    # Check Ollama connectivity
    local ollama_url
    ollama_url=$(node -e "
        try {
            const c = JSON.parse(require('fs').readFileSync('$HEX_DIR/hex.json','utf8'));
            console.log(c.models?.providers?.ollama?.baseUrl || 'not configured');
        } catch(e) { console.log('not configured'); }
    " 2>/dev/null || echo "not configured")

    if [ "$ollama_url" != "not configured" ]; then
        # Strip /v1 suffix for the tags endpoint
        local base="${ollama_url%/v1}"
        if curl -s --connect-timeout 3 "${base}/api/tags" >/dev/null 2>&1; then
            echo "  Ollama:  OK ($ollama_url)"
        else
            echo "  Ollama:  UNREACHABLE ($ollama_url)"
        fi
    else
        echo "  Ollama:  not configured"
    fi

    # Config info
    echo "  Config:  $HEX_DIR/hex.json"
    echo "  Logs:    $LOG_FILE"
    echo ""
}

cmd_restart() {
    cmd_stop
    sleep 1
    cmd_start
}

cmd_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "No log file found at $LOG_FILE"
    fi
}

# --- Main -------------------------------------------------------------------

case "${1:-status}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    status)  cmd_status ;;
    restart) cmd_restart ;;
    logs)    cmd_logs ;;
    *)
        echo "Usage: termux-gateway.sh {start|stop|status|restart|logs}"
        exit 1
        ;;
esac
