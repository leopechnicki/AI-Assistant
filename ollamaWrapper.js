const axios = require('axios');

const MODEL = process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';
const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';

/**
 * Runs the DeepSeek tool-calling model via Ollama.
 * @param {string} system - System prompt for the model.
 * @param {Array} tools - Tool definitions.
 * @param {Array} messages - Conversation history including user input.
 * @returns {Promise<object>} Resolves with parsed JSON response from the model.
 */
async function runOllamaChat(system, tools, messages) {
  const payload = {
    model: MODEL,
    system,
    tools,
    messages
  };
  console.log('model input', JSON.stringify(payload));
  const res = await axios.post(`${BASE}/api/chat`, payload);
  return res.data.message || res.data;
}

module.exports = { runOllamaChat };
