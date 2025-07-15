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

Use the **Stream** checkbox in the UI to receive incremental tokens. The server
exposes a `/api/chat/stream` endpoint that streams responses using
Server-Sent Events.

## Testing

Run unit and integration tests with:
```bash
npm test
```


## Bluetooth via MCP

The server can attempt to connect to a Bluetooth device using MCP. Send a `POST` request to `/api/connect` with a JSON body containing an `address` field.
