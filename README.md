# AI Assistant Chatbot

This project is a simple chat application built with React that interacts with the OpenAI API using a server-side secret. The web page lets you send messages to the assistant.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Provide your OpenAI API key via the `OPENAI_API_KEY` environment variable.
3. Start the server using `nps` to choose the LLM environment:
   ```bash
   npx nps start
   ```
   You'll be prompted to select **Local** (to use devices via MCP) or **OpenAI**.
4. Open `http://localhost:3000` in your browser.

## Testing

Run unit and integration tests with:
```bash
npm test
```


## Bluetooth via MCP

The server can attempt to connect to a Bluetooth device using MCP. Send a `POST` request to `/api/connect` with a JSON body containing an `address` field.
