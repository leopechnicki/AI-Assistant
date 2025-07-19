# AI Assistant Chatbot

This project is a small React application that communicates with a local Ollama instance. It uses the `MFDoom/deepseek-r1-tool-calling:8b` model which supports function/tool calling.

## Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Pull the required model using Ollama
   ```bash
   ollama pull MFDoom/deepseek-r1-tool-calling:8b
   ```
3. Start the server
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

## Configuration

The application talks to Ollama at `http://localhost:11434/api`. If you need to change the base URL set the `OLLAMA_BASE` environment variable before starting the server (defaults to the local endpoint).

## Tool Calling

Requests to Ollama always include `stream: true`. Tool calls follow this flow:

1. User message is sent:
   ```json
   { "role": "user", "content": "What is the weather in Warsaw?" }
   ```
2. Ollama responds with tool calls:
   ```json
   {
     "role": "assistant",
     "content": null,
     "tool_calls": [
       {
         "id": "toolcall-abc123",
         "type": "function",
         "function": {
           "name": "getWeather",
           "arguments": "{\"location\": \"Warsaw\"}"
         }
       }
     ]
   }
   ```
3. The application invokes the tool and replies using the same `tool_call_id`:
   ```json
   {
     "role": "tool",
     "tool_call_id": "toolcall-abc123",
     "name": "getWeather",
     "content": "{\"temperature\": \"22C\", \"condition\": \"cloudy\"}"
   }
   ```
4. Ollama returns the final assistant message which is streamed to the UI.

## Running Tests

Execute all unit and integration tests with
```bash
npm test
```
