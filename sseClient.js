// Streaming chat client using fetch and eventsource-parser
// Sends a request to Ollama's /api/chat endpoint and prints streamed output

const { createParser } = require('eventsource-parser');

/**
 * Stream chat completion from Ollama.
 * @param {Array} messages - Chat history formatted for /api/chat.
 * @param {string} model - Model name, defaults to environment variable or unspecified.
 */
async function streamChat(messages, model) {
  const body = {
    stream: true,
    messages,
  };
  if (model) body.model = model;

  // Send POST request using fetch
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  // Set up SSE parser
  const parser = createParser(event => {
    if (event.type !== 'event') return; // ignore other events
    if (!event.data) return; // skip empty events
    if (event.data === '[DONE]') {
      console.log('\n[complete]');
      return;
    }
    const payload = JSON.parse(event.data);
    const delta = payload.delta || payload.message || {};
    if (delta.content) process.stdout.write(delta.content);
  });

  const decoder = new TextDecoder();

  // Read and decode the stream chunk by chunk
  for await (const chunk of response.body) {
    parser.feed(decoder.decode(chunk));
  }
}

// Example usage when run directly
if (require.main === module) {
  const prompt = process.argv.slice(2).join(' ') || 'Hello';
  streamChat([{ role: 'user', content: prompt }]).catch(err => console.error(err));
}

module.exports = { streamChat };
