#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${HEX_IMAGE:-${CLAWDBOT_IMAGE:-hex:local}}"
CONFIG_DIR="${HEX_CONFIG_DIR:-${CLAWDBOT_CONFIG_DIR:-$HOME/.hex}}"
WORKSPACE_DIR="${HEX_WORKSPACE_DIR:-${CLAWDBOT_WORKSPACE_DIR:-$HOME/.hex/workspace}}"
PROFILE_FILE="${HEX_PROFILE_FILE:-${CLAWDBOT_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e HEX_LIVE_TEST=1 \
  -e HEX_LIVE_MODELS="${HEX_LIVE_MODELS:-${CLAWDBOT_LIVE_MODELS:-all}}" \
  -e HEX_LIVE_PROVIDERS="${HEX_LIVE_PROVIDERS:-${CLAWDBOT_LIVE_PROVIDERS:-}}" \
  -e HEX_LIVE_MODEL_TIMEOUT_MS="${HEX_LIVE_MODEL_TIMEOUT_MS:-${CLAWDBOT_LIVE_MODEL_TIMEOUT_MS:-}}" \
  -e HEX_LIVE_REQUIRE_PROFILE_KEYS="${HEX_LIVE_REQUIRE_PROFILE_KEYS:-${CLAWDBOT_LIVE_REQUIRE_PROFILE_KEYS:-}}" \
  -v "$CONFIG_DIR":/home/node/.hex \
  -v "$WORKSPACE_DIR":/home/node/.hex/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"
