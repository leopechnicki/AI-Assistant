# AI Assistant Chatbot

This project is a small React application that communicates with a local Ollama instance. Any locally available model can be used.

## Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Pull the DeepSeek tool-calling model (or your own) with Ollama
   ```bash
   ollama pull MFDoom/deepseek-r1-tool-calling:8b
   ```
3. Start the server
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

## Configuration

The application talks to Ollama at `http://localhost:11434/api`. By default it uses the `MFDoom/deepseek-r1-tool-calling:8b` model. Set `OLLAMA_MODEL` to use another model or `OLLAMA_BASE` if your Ollama server runs elsewhere.

Set `WEATHER_API_KEY` with a Visual Crossing API key to enable the weather tool.

## Running Tests

Execute all unit and integration tests with
```bash
npm test
```
