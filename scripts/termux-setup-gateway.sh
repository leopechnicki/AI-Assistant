#!/data/data/com.termux/files/usr/bin/bash
# Hex Gateway Setup for Termux
# One-time setup script to install and configure Hex on Android.
#
# Usage:
#   bash termux-setup-gateway.sh              # Gateway-only (remote Ollama)
#   bash termux-setup-gateway.sh --with-ollama # Gateway + local Ollama
#
# Prerequisites:
#   - Termux (from F-Droid, NOT Play Store)
#   - Termux:API addon (for wakelock, notifications)
#   - Internet connection

set -euo pipefail

# --- Helpers ----------------------------------------------------------------

HEX_DIR="$HOME/.hex"
AGENT_DIR="$HEX_DIR/agents/main/agent"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WITH_OLLAMA=false

toast() {
    if command -v termux-toast &>/dev/null; then
        termux-toast "$1"
    fi
    echo "$1"
}

die() {
    echo "ERROR: $1" >&2
    toast "Setup failed: $1"
    exit 1
}

# --- Parse arguments --------------------------------------------------------

for arg in "$@"; do
    case "$arg" in
        --with-ollama) WITH_OLLAMA=true ;;
        --help|-h)
            echo "Usage: bash termux-setup-gateway.sh [--with-ollama]"
            echo ""
            echo "  --with-ollama   Configure for local Ollama (runs on phone)"
            echo "  (default)       Configure for remote Ollama (runs on your PC)"
            exit 0
            ;;
        *) die "Unknown argument: $arg" ;;
    esac
done

# --- Banner -----------------------------------------------------------------

echo ""
echo "  ============================================"
echo "   Hex Gateway Setup for Termux"
echo "  ============================================"
echo ""
if $WITH_OLLAMA; then
    echo "  Mode: Gateway + Local Ollama (self-contained)"
else
    echo "  Mode: Gateway only (remote Ollama)"
fi
echo ""

# --- Step 1: Install Termux packages ----------------------------------------

echo "==> Installing Termux packages..."
pkg upgrade -y
pkg install -y nodejs-lts python build-essential binutils git curl

# Termux:API (for wakelock, notifications, toast)
if ! command -v termux-toast &>/dev/null; then
    echo ""
    echo "  Termux:API not found. Install it from F-Droid for:"
    echo "  - Wakelock (keep gateway running in background)"
    echo "  - Toast notifications"
    echo "  - Home screen widgets"
    echo ""
    echo "  F-Droid: https://f-droid.org/packages/com.termux.api/"
    echo ""
    read -rp "  Continue without Termux:API? [Y/n] " yn
    case "$yn" in
        [Nn]*) die "Install Termux:API first, then re-run this script." ;;
    esac
else
    pkg install -y termux-api 2>/dev/null || true
fi

# --- Step 2: Verify Node.js version -----------------------------------------

echo "==> Checking Node.js version..."
NODE_VER=$(node --version | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 22 ]; then
    die "Node.js 22+ required (got v$NODE_VER). Run: pkg upgrade nodejs-lts"
fi
echo "  Node.js v$NODE_VER"

# --- Step 3: Install pnpm + Hex --------------------------------------------

echo "==> Installing pnpm..."
npm install -g pnpm@latest 2>/dev/null || true

echo "==> Installing Hex..."
# Use --ignore-optional to skip native modules that may fail on Termux
# (sharp, @napi-rs/canvas, etc. — not needed for gateway+Telegram)
npm install -g hex@latest --ignore-optional
echo "  $(hex --version 2>/dev/null || echo 'hex installed')"

# --- Step 4: Create config directories --------------------------------------

echo "==> Creating config directories..."
mkdir -p "$HEX_DIR"
mkdir -p "$AGENT_DIR"

# --- Step 5: Gather user input ----------------------------------------------

echo ""
echo "==> Configuration"
echo ""

# Telegram bot token
read -rp "  Telegram bot token (from @BotFather): " TELEGRAM_TOKEN
if [ -z "$TELEGRAM_TOKEN" ]; then
    echo "  (skipped — you can add it later in $HEX_DIR/.env)"
fi

# Ollama endpoint
if $WITH_OLLAMA; then
    OLLAMA_URL="http://127.0.0.1:11434/v1"
    echo "  Ollama URL: $OLLAMA_URL (local — make sure Ollama Android app is running)"
    echo ""
    echo "  Recommended models for phone:"
    echo "    - qwen2.5:3b   (fast, ~2GB RAM)"
    echo "    - qwen2.5:7b   (better quality, ~4GB RAM)"
    echo "    - llama3.2:3b   (fast alternative)"
    echo ""
    echo "  Install Ollama for Android from Play Store or F-Droid,"
    echo "  then pull a model: the app handles this in its UI."
else
    echo "  Enter your PC's IP address where Ollama is running."
    echo "  (Find it with: ipconfig on Windows, ip addr on Linux)"
    echo ""
    read -rp "  Ollama host IP [192.168.1.100]: " OLLAMA_HOST
    OLLAMA_HOST="${OLLAMA_HOST:-192.168.1.100}"
    OLLAMA_URL="http://${OLLAMA_HOST}:11434/v1"
    echo "  Ollama URL: $OLLAMA_URL"
fi

# --- Step 6: Write .env file ------------------------------------------------

echo "==> Writing $HEX_DIR/.env..."
cat > "$HEX_DIR/.env" << EOF
OLLAMA_API_KEY=ollama-local
EOF

if [ -n "$TELEGRAM_TOKEN" ]; then
    echo "TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN" >> "$HEX_DIR/.env"
fi

# --- Step 7: Write hex.json ------------------------------------------------

echo "==> Writing $HEX_DIR/hex.json..."

# Choose models based on mode
if $WITH_OLLAMA; then
    PRIMARY_MODEL="ollama/qwen2.5:3b"
    FALLBACK_MODEL="ollama/qwen2.5:7b"
    # Smaller models for on-device inference
    MODELS_JSON=$(cat << 'MODELS'
          {
            "id": "qwen2.5:3b",
            "name": "Qwen 2.5 3B",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 32768,
            "maxTokens": 4096
          },
          {
            "id": "qwen2.5:7b",
            "name": "Qwen 2.5 7B",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 32768,
            "maxTokens": 8192
          }
MODELS
    )
else
    PRIMARY_MODEL="ollama/qwen2.5:7b"
    FALLBACK_MODEL="ollama/llama3.1:8b"
    # Bigger models since inference is remote
    MODELS_JSON=$(cat << 'MODELS'
          {
            "id": "qwen2.5:7b",
            "name": "Qwen 2.5 7B",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 32768,
            "maxTokens": 8192
          },
          {
            "id": "qwen2.5:14b",
            "name": "Qwen 2.5 14B",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 32768,
            "maxTokens": 16384
          },
          {
            "id": "llama3.1:8b",
            "name": "Llama 3.1 8B",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 32768,
            "maxTokens": 8192
          }
MODELS
    )
fi

# Build the Telegram channel block
if [ -n "$TELEGRAM_TOKEN" ]; then
    TELEGRAM_BLOCK=$(cat << TGEOF
    "telegram": {
      "enabled": true,
      "commands": { "native": false },
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "groupPolicy": "allowlist",
      "streamMode": "off",
      "actions": { "reactions": true, "sendMessage": true }
    }
TGEOF
    )
else
    TELEGRAM_BLOCK='"telegram": { "enabled": false }'
fi

cat > "$HEX_DIR/hex.json" << HEXEOF
{
  "meta": {
    "lastTouchedVersion": "0.1.0",
    "lastTouchedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "$PRIMARY_MODEL",
        "fallbacks": ["$FALLBACK_MODEL"]
      },
      "maxConcurrent": 2
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "$OLLAMA_URL",
        "api": "openai-completions",
        "models": [
$MODELS_JSON
        ]
      }
    }
  },
  "channels": {
    $TELEGRAM_BLOCK
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback"
  }
}
HEXEOF

# --- Step 8: Write auth profiles -------------------------------------------

echo "==> Writing auth profiles..."
cat > "$AGENT_DIR/auth-profiles.json" << 'EOF'
{
  "version": 1,
  "profiles": {
    "ollama:default": {
      "type": "api_key",
      "provider": "ollama",
      "key": "ollama-local"
    }
  }
}
EOF

# --- Step 9: Install runner scripts ----------------------------------------

echo "==> Installing gateway runner scripts..."

# Copy runner script to a convenient location
RUNNER_SRC="$SCRIPT_DIR/termux-gateway.sh"
if [ -f "$RUNNER_SRC" ]; then
    cp "$RUNNER_SRC" "$HOME/termux-gateway.sh"
    chmod +x "$HOME/termux-gateway.sh"
    echo "  Runner: ~/termux-gateway.sh"
fi

# Create Termux:Widget shortcut
WIDGET_SRC="$SCRIPT_DIR/termux-gateway-widget.sh"
mkdir -p "$HOME/.shortcuts"
if [ -f "$WIDGET_SRC" ]; then
    cp "$WIDGET_SRC" "$HOME/.shortcuts/hex-gateway"
    chmod +x "$HOME/.shortcuts/hex-gateway"
    echo "  Widget: ~/.shortcuts/hex-gateway"
fi

# --- Step 10: Verify -------------------------------------------------------

echo ""
echo "==> Verifying installation..."
echo "  Hex version: $(hex --version 2>/dev/null || echo 'not found')"
echo "  Config: $HEX_DIR/hex.json"
echo "  Auth:   $AGENT_DIR/auth-profiles.json"
echo "  Env:    $HEX_DIR/.env"

# Quick JSON validation
if node -e "JSON.parse(require('fs').readFileSync('$HEX_DIR/hex.json','utf8'))" 2>/dev/null; then
    echo "  Config JSON: valid"
else
    echo "  WARNING: hex.json may have syntax errors"
fi

# --- Done -------------------------------------------------------------------

echo ""
echo "  ============================================"
echo "   Setup complete!"
echo "  ============================================"
echo ""
echo "  Start the gateway:"
echo "    bash ~/termux-gateway.sh start"
echo ""
echo "  Or use the home screen widget (if Termux:Widget is installed)."
echo ""

if $WITH_OLLAMA; then
    echo "  Make sure Ollama Android app is running before starting."
    echo "  Pull a model in the Ollama app: qwen2.5:3b (recommended for phone)"
else
    echo "  Make sure Ollama is running on your PC ($OLLAMA_URL)."
    echo "  Start Ollama: ollama serve"
fi

echo ""
echo "  Test: send a message to your Telegram bot!"
echo ""

toast "Hex setup complete!"
