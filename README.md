# AI Assistant (clawdbot)

Personal AI assistant powered by [clawdbot/OpenClaw](https://github.com/clawdbot/clawdbot). Run it on your local machine and chat via **Telegram** or the built-in web dashboard.

## Prerequisites

- **Node.js >= 22** ([install with fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm))
- **Anthropic API Key** ([get one here](https://console.anthropic.com/)) or OpenAI API Key
- **Telegram bot token** (create one with [@BotFather](https://t.me/BotFather))

## Quick Start

```bash
# 1. Install project dependencies
npm install

# 2. Run interactive setup (installs clawdbot, configures Telegram)
npm run setup

# 3. Start the assistant
npm start
```

The setup wizard will:
- Install clawdbot globally if not present
- Ask for your AI provider and API key
- Ask for your Telegram bot token
- Generate the configuration at `~/.openclaw/openclaw.json`

## Usage

After setup, just run:

```bash
npm start
```

Then message your bot on Telegram. The first message will require **pairing approval** in the terminal.

The gateway dashboard is available at `http://localhost:18789/`.

## Commands

| Command | Description |
|---|---|
| `npm run setup` | Interactive setup wizard |
| `npm start` | Start the clawdbot gateway |
| `npm start -- --verbose` | Start with verbose logging |
| `npm run status` | Check installation status |

## Configuration

Configuration is stored at `~/.openclaw/openclaw.json`. The setup wizard generates it for you, but you can edit it manually.

Minimal Telegram config:

```json
{
  "agent": {
    "model": "anthropic/claude-sonnet-4-20250514"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TOKEN",
      "dmPolicy": "pairing"
    }
  },
  "gateway": {
    "port": 18789
  }
}
```

API keys can be set in a `.env` file (copy `.env.example`) or as environment variables:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Creating a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name and username (must end in `bot`)
4. Copy the token and paste it during `npm run setup`

## Architecture

This project is a thin launcher for clawdbot. It handles:

- **setup.js** - Interactive configuration wizard
- **index.js** - Starts the clawdbot gateway process
- **lib/gateway.js** - Gateway process management and config I/O

clawdbot itself handles all AI processing, Telegram integration, and the web dashboard.

## Documentation

- [OpenClaw Docs](https://docs.openclaw.ai/)
- [Telegram Channel Setup](https://docs.openclaw.ai/channels/telegram)
- [GitHub Repository](https://github.com/clawdbot/clawdbot)

## Running Tests

```bash
npm test
```
