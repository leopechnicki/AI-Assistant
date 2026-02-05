---
summary: "Uninstall Hex completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Hex from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `hex` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
hex uninstall
```

Non-interactive (automation / npx):

```bash
hex uninstall --all --yes --non-interactive
npx -y hex uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
hex gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
hex gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${HEX_STATE_DIR:-$HOME/.hex}"
```

If you set `HEX_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.hex/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g hex
pnpm remove -g hex
bun remove -g hex
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Hex.app
```

Notes:

- If you used profiles (`--profile` / `HEX_PROFILE`), repeat step 3 for each state dir (defaults are `~/.hex-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `hex` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.hex.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.hex.*` plists if present.

### Linux (systemd user unit)

Default unit name is `hex-gateway.service` (or `hex-gateway-<profile>.service`):

```bash
systemctl --user disable --now hex-gateway.service
rm -f ~/.config/systemd/user/hex-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Hex Gateway` (or `Hex Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Hex Gateway"
Remove-Item -Force "$env:USERPROFILE\.hex\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.hex-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://hex.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g hex@latest`.
Remove it with `npm rm -g hex` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `hex ...` / `bun run hex ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
