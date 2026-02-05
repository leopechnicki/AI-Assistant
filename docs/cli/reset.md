---
summary: "CLI reference for `hex reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `hex reset`

Reset local config/state (keeps the CLI installed).

```bash
hex reset
hex reset --dry-run
hex reset --scope config+creds+sessions --yes --non-interactive
```
