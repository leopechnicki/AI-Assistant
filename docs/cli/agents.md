---
summary: "CLI reference for `hex agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `hex agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
hex agents list
hex agents add work --workspace ~/.hex/workspace-work
hex agents set-identity --workspace ~/.hex/workspace --from-identity
hex agents set-identity --agent main --avatar avatars/hex.png
hex agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.hex/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
hex agents set-identity --workspace ~/.hex/workspace --from-identity
```

Override fields explicitly:

```bash
hex agents set-identity --agent main --name "Hex" --emoji "🦞" --avatar avatars/hex.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Hex",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/hex.png",
        },
      },
    ],
  },
}
```
