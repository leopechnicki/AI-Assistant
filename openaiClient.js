const OpenAI = require('openai');
const MCP = require('./mcp');
const DEFAULT_OLLAMA_MODEL = 'deepseek-r1:7b';

let createClient = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let env = process.env.LLM_ENV || 'openai';

function setEnv(newEnv) {
  env = newEnv;
}

function getEnv() {
  return env;
}

async function sendMessage(message, devices = []) {
  let result = '';
  for await (const part of sendMessageStream(message, devices)) {
    result += part;
  }
  return result;
}

async function* sendMessageStream(message, devices = []) {
  if (env === 'local') {
    const mcp = new MCP(devices);
    const reply = await mcp.broadcast(message);
    yield reply.join(', ');
    return;
  }

  if (env === 'ollama') {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
        stream: true,
        messages: [{ role: 'user', content: message }]
      })
    });
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const data = JSON.parse(trimmed);
        const token = data.message?.content;
        if (token) yield token;
      }
    }
    return;
  }

  const openai = createClient();
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
    stream: true
  });
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content;
    if (token) yield token;
  }
}

function setClientFactory(fn) {
  createClient = fn;
}

module.exports = { sendMessage, sendMessageStream, setEnv, setClientFactory, getEnv };
