# AI Assistant Chatbot

This project is a simple chat application built with React that interacts with the OpenAI API using a server-side secret. The web page lets you send messages to the assistant.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Provide your OpenAI API key via the `OPENAI_API_KEY` environment variable.
3. (Optional) Set `OLLAMA_MODEL` to change the default model used by Ollama.
4. Start the server using `nps` to choose the LLM environment:
   ```bash
   npx nps start
   ```
   You'll be prompted to select **OpenAI** or **Ollama (Local)**, then choose a model (currently only **DeepSeek R1:7b**).
5. Open `http://localhost:3000` in your browser.

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



## Bluetooth via MCP

The server can attempt to connect to a Bluetooth device using MCP. Send a `POST` request to `/api/connect` with a JSON body containing an `address` field.

## Node-RED Integration

Import the supplied Node-RED flow JSON to quickly wire the assistant into your existing automation:

1. Start your Node-RED instance.
2. From the menu, choose **Import → Clipboard** and paste the contents of the provided flow JSON file.
3. Click **Import** and deploy the flow.

The flow exposes buttons for standard actions such as sending messages and shutting down the host. A new **Update Assistant** button triggers an HTTP request to `/api/update`, which runs `git pull` on the server. Ensure `git` is installed and the repository has write access to its remote so the update can succeed.
