#!/data/data/com.termux/files/usr/bin/bash
# Hex Gateway Widget - One-tap toggle for Termux:Widget
# Place in ~/.shortcuts/ for home screen access.
#
# Tap: if running, show status; if stopped, start it.

HEX_DIR="$HOME/.hex"
PID_FILE="$HEX_DIR/termux-gateway.pid"
RUNNER="$HOME/termux-gateway.sh"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    # Running — show status toast
    PID=$(cat "$PID_FILE")
    RSS_KB=$(ps -o rss= -p "$PID" 2>/dev/null || echo "0")
    RSS_MB=$(( RSS_KB / 1024 ))
    termux-toast "Gateway running (PID $PID, ${RSS_MB}MB)"
else
    # Not running — start it
    termux-toast "Starting Hex Gateway..."
    if [ -f "$RUNNER" ]; then
        bash "$RUNNER" start
    else
        termux-toast "Runner not found. Run setup first."
    fi
fi
