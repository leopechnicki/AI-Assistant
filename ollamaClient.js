const axios = require('axios');

// Default model is the deepseek tool-calling model unless overridden
const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';
const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';

const systemPrompt = 'You are a helpful assistant.';


async function readStream(res) {
  let buffer = '';
  const messages = [];
  for await (const chunk of res.data) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      messages.push(JSON.parse(line));
    }
  }
  return messages;
}

async function* sendMessageStream(message) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];
  const res = await axios.post(
    `${BASE}/api/chat`,
    { model: DEFAULT_MODEL, messages, stream: true },
    { responseType: 'stream' }
  );
  let buffer = '';
  for await (const chunk of res.data) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const data = JSON.parse(trimmed);
      const delta = data.message || data;
      if (delta.content) yield delta.content;
    }
  }
  const trimmed = buffer.trim();
  if (trimmed) {
    const data = JSON.parse(trimmed);
    const delta = data.message || data;
    if (delta.content) yield delta.content;
  }
}

async function sendMessage(message) {
  let out = '';
  for await (const part of sendMessageStream(message)) out += part;
  return out;
}

function getEnv() {
  return 'ollama';
}

async function listModels() {
  return [DEFAULT_MODEL];
}

async function generateCompletion(prompt) {
  const res = await axios.post(
    `${BASE}/api/generate`,
    { model: DEFAULT_MODEL, prompt, stream: true },
    { responseType: 'stream' }
  );
  const parts = await readStream(res);
  return parts.map(p => p.response || '').join('');
}

async function showModel(model) {
  const res = await axios.post(`${BASE}/api/show`, { model: model || DEFAULT_MODEL });
  return res.data;
}

module.exports = {
  sendMessage,
  sendMessageStream,
  listModels,
  generateCompletion,
  showModel,
  getEnv
};
