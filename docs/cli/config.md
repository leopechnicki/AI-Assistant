---
summary: "CLI reference for `hex config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `hex config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `hex configure`).

## Examples

```bash
hex config get browser.executablePath
hex config set browser.executablePath "/usr/bin/google-chrome"
hex config set agents.defaults.heartbeat.every "2h"
hex config set agents.list[0].tools.exec.node "node-id-or-name"
hex config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
hex config get agents.defaults.workspace
hex config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
hex config get agents.list
hex config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
hex config set agents.defaults.heartbeat.every "0m"
hex config set gateway.port 19001 --json
hex config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
