// Tool calling demo using Ollama's /api/chat endpoint
// This script streams a prompt, handles function calls, and streams the final response.

const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';

// Tool definition compatible with DeepSeek's schema
const weatherTool = {
  type: 'function',
  function: {
    name: 'get_current_weather',
    description: 'Return current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature unit'
        }
      },
      required: ['location']
    }
  }
};

// Dummy local function used when a tool call is requested
function get_current_weather({ location, unit = 'celsius' }) {
  return { location, temperature: unit === 'celsius' ? '22C' : '71F', condition: 'sunny' };
}

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
async function requestOllama(messages, function_call) {
  const body = {
    model: MODEL,
    stream: true,
    function_call,
    tools: [weatherTool],
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
  const toolCalls = {};

  // First request allows the model to decide whether to call a function
  for await (const evt of await requestOllama(history, 'auto')) {
    const delta = evt.delta || {};
    if (delta.content) console.log(delta.content); // stream text
    if (delta.tool_calls) {
      for (const call of delta.tool_calls) {
        const existing = toolCalls[call.id] || { id: call.id, function: { name: '', arguments: '' } };
        if (call.function.name) existing.function.name = call.function.name;
        if (call.function.arguments) existing.function.arguments += call.function.arguments;
        toolCalls[call.id] = existing;
      }
    }
  }

  const calls = Object.values(toolCalls);
  if (!calls.length) return; // no tool calls detected

  // Execute tools locally and prepare follow-up messages
  history.push({ role: 'assistant', tool_calls: calls });

  for (const c of calls) {
    const args = JSON.parse(c.function.arguments || '{}');
    let result = {};
    if (c.function.name === 'get_current_weather') result = get_current_weather(args);
    history.push({
      role: 'tool',
      tool_call_id: c.id,
      content: JSON.stringify(result)
    });
  }

  // Second request sends tool results and asks for final assistant reply
  for await (const evt of await requestOllama(history, 'none')) {
    const delta = evt.delta || {};
    if (delta.content) console.log(delta.content);
  }
}

// Run if executed directly
if (require.main === module) {
  const prompt = process.argv.slice(2).join(' ') || 'What\'s the weather in Warsaw?';
  chat(prompt).catch(err => console.error(err));
}

module.exports = { chat };
