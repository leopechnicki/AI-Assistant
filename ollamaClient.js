const axios = require('axios');
const MCP = require('./mcp');

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';
const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';

const systemPrompt = 'You are a helpful assistant.';

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get current weather for a location.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name.' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit.' }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to a recipient.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient address.' },
          subject: { type: 'string', description: 'Email subject.' },
          body: { type: 'string', description: 'Email body.' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  }
];

const availableFunctions = {
  get_current_weather: async (location, unit = 'celsius') => {
    const data = {
      Warsaw: { temperature: '22C', condition: 'cloudy' }
    };
    return data[location] || { error: 'unknown location' };
  },
  send_email: async (to, subject, body) => {
    return { status: 'sent', to, subject };
  }
};

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

async function requestOllama(messages, model) {
  const res = await axios.post(
    `${BASE}/api/chat`,
    { model, messages, stream: true, tools, tool_choice: 'auto' },
    { responseType: 'stream' }
  );
  const parts = await readStream(res);
  const final = { role: 'assistant', content: '', tool_calls: null };
  for (const p of parts) {
    if (p.message?.content) final.content += p.message.content;
    if (p.message?.tool_calls) final.tool_calls = p.message.tool_calls;
  }
  return final;
}

async function executeToolCalls(msg, history, model) {
  if (!Array.isArray(msg.tool_calls) || !msg.tool_calls.length) {
    return msg.content || '';
  }
  history.push(msg);
  for (const call of msg.tool_calls) {
    const fn = availableFunctions[call.function.name];
    const args = JSON.parse(call.function.arguments);
    const result = fn ? await fn(...Object.values(args)) : { error: 'not implemented' };
    history.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.function.name,
      content: JSON.stringify(result)
    });
  }
  const followUp = await requestOllama(history, model);
  return followUp.content || '';
}

async function* sendMessageStream(message, devices = [], options = {}) {
  const env = options.env || 'ollama';
  if (env === 'local') {
    const mcp = new MCP(devices);
    const reply = await mcp.broadcast(message);
    yield reply.join(', ');
    return;
  }
  if (env !== 'ollama') throw new Error('Invalid env');

  const history = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];

  const first = await requestOllama(history, DEFAULT_MODEL);
  const content = await executeToolCalls(first, history, DEFAULT_MODEL);
  if (content) yield content;
}

async function sendMessage(message, devices = [], options = {}) {
  let out = '';
  for await (const part of sendMessageStream(message, devices, options)) out += part;
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
