const { Ollama } = require('ollama');

const MODEL = process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';
const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const client = new Ollama({ host: BASE });

/**
 * Runs the DeepSeek tool-calling model via Ollama.
 * @param {string} system - System prompt for the model.
 * @param {Array} tools - Tool definitions.
 * @param {Array} messages - Conversation history including user input.
 * @returns {Promise<object>} Resolves with parsed JSON response from the model.
 */
function parseToolCalls(message) {
  const regex = /<\|tool▁call▁begin\|>([\s\S]*?)<\|tool▁call▁end\|>/;
  const match = message.match(regex);
  if (!match) return { text: message, toolCalls: [] };
  let calls = [];
  try {
    calls = JSON.parse(match[1]);
    if (!Array.isArray(calls)) calls = [calls];
  } catch (err) {
    console.error('failed to parse tool calls', err);
  }
  return { text: message.replace(regex, '').trim(), toolCalls: calls };
}

async function runOllamaChat(system, tools, messages) {
  const payload = {
    model: MODEL,
    system,
    tools,
    messages
  };
  console.log('model input', JSON.stringify(payload));
  const res = await client.chat(payload);
  const msg = res.message || res;
  if (msg.content) {
    const { text, toolCalls } = parseToolCalls(msg.content);
    msg.content = text;
    msg.tool_calls = toolCalls;
  }
  return msg;
}

module.exports = { runOllamaChat };
