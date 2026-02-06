# Hex

Your personal AI agent. Any OS. Any platform. Fully customizable.

Hex is a powerful, open-source AI agent that runs locally on your machine. Built on [Hex](https://github.com/hex/hex), it connects to your favorite messaging platforms and AI models to provide a truly personal AI experience.

## Features

- **Multi-platform messaging**: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and more
- **Multiple AI providers**: Claude, GPT, DeepSeek, and local models
- **Browser control**: Automate Chrome/Chromium with screenshots and actions
- **Skills system**: 55+ built-in skills, extensible with custom ones
- **Gateway dashboard**: Local web UI for management
- **Terminal UI (TUI)**: Interactive terminal chat interface
- **Plugin SDK**: Build custom extensions and integrations
- **Memory & RAG**: Vector-based memory with session persistence
- **Fully customizable**: Fork it, modify it, make it yours

## Quick Start

### Prerequisites

- Node.js 22.12.0 or later
- pnpm 10.x

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd hex

# Install dependencies
pnpm install

# Build
pnpm build

# Run onboarding
pnpm hex onboard

# Start the gateway
pnpm start
```

## Development

```bash
# Run in development mode
pnpm dev

# Run tests
pnpm test

# Start the TUI
pnpm tui

# Start gateway in dev mode
pnpm gateway:dev
```

## Configuration

Hex stores its configuration in `~/.hex/hex.json`. You can override the location with the `HEX_CONFIG_PATH` environment variable.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `HEX_CONFIG_PATH` | Custom config file path |
| `HEX_STATE_DIR` | Custom state directory |
| `HEX_GATEWAY_PORT` | Gateway port (default: 18789) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |

## Architecture

Hex is built as a modular TypeScript application:

- `src/` — Core source code (agents, channels, gateway, CLI, config, etc.)
- `extensions/` — Channel and integration extensions (33+)
- `skills/` — Built-in skill modules (55+)
- `ui/` — React-based web UI components
- `packages/` — Additional packages
- `docs/` — Documentation

## License

MIT
