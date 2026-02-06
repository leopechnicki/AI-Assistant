#!/usr/bin/env bash
set -euo pipefail

cd /repo

export HEX_STATE_DIR="/tmp/hex-test"
export HEX_CONFIG_PATH="${HEX_STATE_DIR}/hex.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${HEX_STATE_DIR}/credentials"
mkdir -p "${HEX_STATE_DIR}/agents/main/sessions"
echo '{}' >"${HEX_CONFIG_PATH}"
echo 'creds' >"${HEX_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${HEX_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm hex reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${HEX_CONFIG_PATH}"
test ! -d "${HEX_STATE_DIR}/credentials"
test ! -d "${HEX_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${HEX_STATE_DIR}/credentials"
echo '{}' >"${HEX_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm hex uninstall --state --yes --non-interactive

test ! -d "${HEX_STATE_DIR}"

echo "OK"
