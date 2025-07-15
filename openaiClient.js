const OpenAI = require('openai');
const MCP = require('./mcp');

let createClient = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let env = process.env.LLM_ENV || 'openai';

function setEnv(newEnv) {
  env = newEnv;
}

async function sendMessage(message, devices = []) {
  if (env === 'local') {
    const mcp = new MCP(devices);
    return mcp.broadcast(message);
  }

  const openai = createClient();
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }]
  });
  return completion.choices[0].message.content;
}

function setClientFactory(fn) {
  createClient = fn;
}

module.exports = { sendMessage, setEnv, setClientFactory };
