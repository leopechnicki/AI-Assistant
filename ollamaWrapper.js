const { spawn } = require('child_process');

/**
 * Runs the DeepSeek tool-calling model via Ollama.
 * @param {string} system - System prompt for the model.
 * @param {Array} tools - Tool definitions.
 * @param {Array} messages - Conversation history including user input.
 * @returns {Promise<object>} Resolves with parsed JSON response from the model.
 */
async function runOllamaChat(system, tools, messages) {
  const payload = { system, tools, messages };
  console.log('model input', JSON.stringify(payload));
  return new Promise((resolve, reject) => {
    const child = spawn('ollama', ['run', 'deepseek-r1-tool-calling:8b', '--json']);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', code => {
      if (stderr) console.error('ollama stderr:', stderr.trim());
      if (code !== 0) {
        return reject(new Error(`ollama exited with code ${code}`));
      }
      try {
        const lines = stdout.trim().split(/\n+/);
        const last = lines[lines.length - 1];
        const parsed = JSON.parse(last);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

module.exports = { runOllamaChat };
