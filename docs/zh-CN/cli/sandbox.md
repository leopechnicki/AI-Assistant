---
read_when: You are managing sandbox containers or debugging sandbox/tool-policy behavior.
status: active
summary: 管理沙箱容器并检查生效的沙箱策略
title: 沙箱 CLI
x-i18n:
  generated_at: "2026-02-03T07:45:18Z"
  model: claude-opus-4-5
  provider: pi
  source_hash: 6e1186f26c77e188206ce5e198ab624d6b38bc7bb7c06e4d2281b6935c39e347
  source_path: cli/sandbox.md
  workflow: 15
---

# 沙箱 CLI

管理基于 Docker 的沙箱容器，用于隔离智能体执行。

## 概述

Hex 可以在隔离的 Docker 容器中运行智能体以确保安全。`sandbox` 命令帮助你管理这些容器，特别是在更新或配置更改后。

## 命令

### `hex sandbox explain`

检查**生效的**沙箱模式/作用域/工作区访问权限、沙箱工具策略和提权门控（附带修复配置的键路径）。

```bash
hex sandbox explain
hex sandbox explain --session agent:main:main
hex sandbox explain --agent work
hex sandbox explain --json
```

### `hex sandbox list`

列出所有沙箱容器及其状态和配置。

```bash
hex sandbox list
hex sandbox list --browser  # List only browser containers
hex sandbox list --json     # JSON output
```

**输出包括：**

- 容器名称和状态（运行中/已停止）
- Docker 镜像及其是否与配置匹配
- 创建时间
- 空闲时间（自上次使用以来的时间）
- 关联的会话/智能体

### `hex sandbox recreate`

移除沙箱容器以强制使用更新的镜像/配置重新创建。

```bash
hex sandbox recreate --all                # Recreate all containers
hex sandbox recreate --session main       # Specific session
hex sandbox recreate --agent mybot        # Specific agent
hex sandbox recreate --browser            # Only browser containers
hex sandbox recreate --all --force        # Skip confirmation
```

**选项：**

- `--all`：重新创建所有沙箱容器
- `--session <key>`：重新创建特定会话的容器
- `--agent <id>`：重新创建特定智能体的容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

**重要：** 容器会在智能体下次使用时自动重新创建。

## 使用场景

### 更新 Docker 镜像后

```bash
# Pull new image
docker pull hex-sandbox:latest
docker tag hex-sandbox:latest hex-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
hex sandbox recreate --all
```

### 更改沙箱配置后

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
hex sandbox recreate --all
```

### 更改 setupCommand 后

```bash
hex sandbox recreate --all
# or just one agent:
hex sandbox recreate --agent family
```

### 仅针对特定智能体

```bash
# Update only one agent's containers
hex sandbox recreate --agent alfred
```

## 为什么需要这个？

**问题：** 当你更新沙箱 Docker 镜像或配置时：

- 现有容器继续使用旧设置运行
- 容器仅在空闲 24 小时后才被清理
- 经常使用的智能体会无限期保持旧容器运行

**解决方案：** 使用 `hex sandbox recreate` 强制移除旧容器。它们会在下次需要时自动使用当前设置重新创建。

提示：优先使用 `hex sandbox recreate` 而不是手动 `docker rm`。它使用 Gateway 网关的容器命名规则，避免在作用域/会话键更改时出现不匹配。

## 配置

沙箱设置位于 `~/.hex/hex.json` 的 `agents.defaults.sandbox` 下（每个智能体的覆盖设置在 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "hex-sandbox:bookworm-slim",
          "containerPrefix": "hex-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## 另请参阅

- [沙箱文档](/gateway/sandboxing)
- [智能体配置](/concepts/agent-workspace)
- [Doctor 命令](/gateway/doctor) - 检查沙箱设置
