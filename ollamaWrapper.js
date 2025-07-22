const { execFileSync } = require('child_process');

/**
 * Run the DeepSeek model using Ollama.
 * @param {object} payload - must include `system`, `tools` and `messages`.
 * @returns {object} Parsed JSON response from the model.
 */
function runDeepSeek(payload) {
  const input = JSON.stringify(payload);
  const output = execFileSync(
    'ollama',
    ['run', 'deepseek-r1-tool-calling:8b', '--json'],
    { input, encoding: 'utf8' }
  );
  // The CLI may emit multiple JSON lines; parse the last one
  const lines = output.trim().split(/\n+/);
  return JSON.parse(lines[lines.length - 1]);
}

module.exports = { runDeepSeek };
