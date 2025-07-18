# AI Assistant Chatbot

This project is a simple chat application built with React that interacts with the OpenAI API using a server-side secret. The web page lets you send messages to the assistant.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Provide your OpenAI API key via the `OPENAI_API_KEY` environment variable.
3. (Optional) Set `LLM_ENV` to `openai` or `ollama` before starting to choose the default provider.
4. Start the server:
   ```bash
   npm start
   ```
   The server starts immediately using the environment variables you set.
5. Open `http://localhost:3000` in your browser.
6. Open the chat UI and pick `OpenAI` or `Ollama` in the provider drop-down before sending any message. The input box and Send button remain disabled until a provider is chosen.
   - `OpenAI` always uses the inexpensive `gpt-3.5-turbo` model.
   - `Ollama` always uses the `deepseek-r1:8b` model.

## Streaming

Responses are always streamed from the server using the `/api/chat/stream` endpoint
and rendered incrementally in the UI.

## File Upload

When running with **Ollama (Local)**, you can attach an image or text file in the chat UI. The file content is sent to `/api/file` and the server responds with a confirmation. Uploads are rejected when using OpenAI.

## Testing

Run unit and integration tests with:
```bash
npm test
```

## Prompts for Best Practices

When crafting prompts for the assistant it can help to remind the model to
follow good conversational etiquette. Example system prompts:

- "You are a helpful assistant that answers concisely and cites sources when available."
- "Explain your reasoning step by step before giving a final answer."



## Node-RED Integration

Import the supplied Node-RED flow JSON to quickly wire the assistant into your existing automation:

1. Start your Node-RED instance.
2. From the menu, choose **Import → Clipboard** and paste the contents of the provided flow JSON file.
3. Click **Import** and deploy the flow.

The flow exposes buttons for standard actions such as sending messages and shutting down the host. A new **Update Assistant** button triggers an HTTP request to `/api/update`, which runs `git pull` on the server. Ensure `git` is installed and the repository has write access to its remote so the update can succeed.

## Server Control

The chat UI provides a power button labeled with a power icon. Clicking it now
prompts for confirmation before sending a `POST` request to `/api/shutdown`. This
endpoint only accepts requests originating from `localhost` to prevent remote
shutdowns.

For maintenance, the server also exposes an `/api/update` endpoint that performs
`git pull`. This is useful for triggering updates programmatically, for example
from the Node-RED flow's **Update Assistant** button.

## Tool Calling

When running in **Ollama (Local)** mode the assistant can execute JavaScript
functions. Two example tools are provided:

- `get_current_weather` – ask "Qual o clima em <cidade>?" to receive a
  simulated forecast.
- `send_email` – use phrases like "Envie um email para ..." to trigger a fake
  email send.

Use the gear icon in the top right to access **Update** and **Shutdown** actions. The **Update** option triggers `/api/update` and performs a `git pull` so you can update the repository from the browser.
