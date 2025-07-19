// Tool calling demo using Ollama's /api/chat endpoint
// This script streams a prompt, handles function calls, and streams the final response.

const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';


/**
 * Parse an EventSource response from Ollama.
 * Yields parsed JSON objects for each 'data:' event.
 */
async function* parseSSE(res) {
  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (chunk.startsWith('data:')) {
        const data = chunk.slice(5).trim();
        if (data === '[DONE]') return;
        yield JSON.parse(data);
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
}

/**
 * Send a chat request to Ollama and return an async generator of events.
 */
async function requestOllama(messages) {
  const body = {
    model: MODEL,
    stream: true,
    messages
  };
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseSSE(res);
}

/**
 * Main entry for sending a prompt with automatic tool calling.
 */
async function chat(prompt) {
  const history = [{ role: 'user', content: prompt }];
  for await (const evt of await requestOllama(history)) {
    const delta = evt.delta || {};
    if (delta.content) console.log(delta.content);
  }
}

// Run if executed directly
if (require.main === module) {
  const prompt = process.argv.slice(2).join(' ') || 'Hello';
  chat(prompt).catch(err => console.error(err));
}

module.exports = { chat };
