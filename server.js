const express = require('express');

const morgan = require('morgan');

const app = express();

// Use more verbose logging
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
const {
  sendMessageStream,
  listModels,
  generateCompletion,
  showModel
} = require('./ollamaClient');
const { runOllamaChat } = require('./ollamaWrapper');
const { exec } = require('child_process');
const axios = require('axios');

function getShutdownCommand() {
  return process.platform === 'win32' ? 'shutdown /s /t 0' : 'shutdown -h now';
}

function isLocal(req) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

// In-memory conversation history for tool-calling chats
const conversation = [];

// Default system prompt and available tools
const systemPrompt = `You are an advanced, highly ethical, and meticulously accurate AI assistant. Your primary directive is to provide factual, verifiable, and precise information.

**Core Principles:**

1.  **Fact-Based Reasoning:** All your responses must be strictly grounded in verifiable facts and evidence. Do not invent, fabricate, or speculate on information. If a piece of information cannot be verified, it should not be presented as fact.
2.  **Avoid Hallucinations:** You must actively prevent the generation of any content that is false, misleading, or constitutes a hallucination. If a query requests information you don't possess or cannot confirm, explicitly state this limitation rather than attempting to generate a plausible but incorrect answer.
3.  **Transparency in Uncertainty:** When you encounter a query for which you have incomplete or uncertain information, clearly communicate this uncertainty. State what you know, what you don't know, and any assumptions you are making.
4.  **Prioritize Veracity:** In all interactions, the utmost priority is given to the truthfulness and accuracy of the information provided.
5.  **Information Sourcing:** You have access to and can process information from a vast array of sources, including publicly available internet data, academic databases, scientific journals, and any indexed information from general web Browse, including what might be referred to as "Deep Web" or ".onion" addresses if such information is within your accessible data and relevant to the query. However, this access does not imply direct "Browse" like a human; rather, it refers to your comprehensive knowledge base derived from extensive training on diverse datasets.
6.  **Contextual Awareness:** Maintain full contextual awareness of the ongoing conversation to ensure relevance and prevent misinterpretations, but never allow context to override factual accuracy.
7.  **Ethical Guidelines:** Adhere strictly to ethical guidelines, avoiding harmful, biased, or inappropriate content.

**Instructions for Interaction:**

* Respond directly and clearly to user queries.
* If a request is ambiguous, ask for clarification.
* If a request requires information beyond your capabilities or existing knowledge, state that you cannot fulfill it.
* Always aim to be helpful and informative within the bounds of factual accuracy.`;
const tools = [
  {
    name: 'get_time',
    description: 'Get the current server time',
    parameters: {
      type: 'object',
      properties: {},
    }
  },
  {
    name: 'get_weather',
    description: 'Get current weather for a city',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' }
      },
      required: ['city']
    }
  }
];

// Tool implementations used by the model
function get_time() {
  return new Date().toISOString();
}

async function get_weather({ city }) {
  const key = process.env.WEATHER_API_KEY;
  if (!key) throw new Error('Weather API key missing');
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(city)}?unitGroup=us&key=${key}&contentType=json`;
  const res = await axios.get(url);
  return res.data;
}

app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    console.log('POST /api/chat/stream missing message');
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    console.log(`POST /api/chat/stream: ${message}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    for await (const chunk of sendMessageStream(message)) {
      res.write(`data: ${chunk}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('stream failed', err);
    res.write(`data: ${err.message}\n\n`);
    res.end();
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    console.log('POST /api/chat missing message');
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    console.log(`POST /api/chat: ${message}`);
    conversation.push({ role: 'user', content: message });

    const system = systemPrompt;
    let messages = [{ role: 'system', content: system }, ...conversation];
    let assistantResponse = await runOllamaChat(system, tools, messages);
    console.log('model output', assistantResponse);

    while (assistantResponse.tool_calls && assistantResponse.tool_calls.length) {
      const call = assistantResponse.tool_calls[0];
      console.log('detected toolCall', call);
      let result;
      try {
        if (call.name === 'get_time') {
          result = get_time();
        } else if (call.name === 'get_weather') {
          result = await get_weather(call.parameters || {});
        } else {
          result = { error: 'Unknown tool' };
        }
      } catch (err) {
        console.error('tool execution failed', err);
        result = { error: err.message };
      }
      console.log('tool result', result);
      const assistantMsg = { role: 'assistant', content: assistantResponse.content || '', tool_calls: [call] };
      const toolMsg = { role: 'tool', name: call.name, content: JSON.stringify(result) };
      conversation.push(assistantMsg, toolMsg);
      messages.push(assistantMsg, toolMsg);
      assistantResponse = await runOllamaChat(system, tools, messages);
      console.log('model output', assistantResponse);
    }

    conversation.push({ role: 'assistant', content: assistantResponse.content });
    res.json({ reply: assistantResponse.content });
  } catch (err) {
    console.error('request failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    console.log('POST /api/generate missing prompt');
    return res.status(400).json({ error: 'prompt is required' });
  }
  try {
    const reply = await generateCompletion(prompt); 
    res.json({ reply });
  } catch (err) {
    console.error('ollama generate failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/show', async (req, res) => {
  const { model } = req.body || {};
  try {
    const info = await showModel(model);
    res.json({ info });
  } catch (err) {
    console.error('ollama show failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/file', async (req, res) => {
  const { name, content } = req.body || {};
  if (!name || !content) {
    console.log('POST /api/file missing file');
    return res.status(400).json({ error: 'File is required' });
  }
  try {
    console.log(`Received file ${name}`);
    res.json({ reply: `Received file ${name}` });
  } catch (err) {
    console.error('File upload failed', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

app.post('/api/shutdown', (req, res) => {
  if (!isLocal(req)) {
    console.log(`Unauthorized shutdown attempt from ${req.ip || req.connection && req.connection.remoteAddress}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  exec(getShutdownCommand(), err => {
    if (err) {
      console.error('Shutdown failed', err);
      return res.status(500).json({ error: 'Shutdown failed' });
    }
    console.log('Shutdown initiated');
    res.json({ reply: 'Shutting down...' });
  });
});

app.post('/api/update', (req, res) => {
  exec('git pull', (err, stdout, stderr) => {
    if (err) {
      console.error('Update failed', err);
      return res.status(500).json({ error: 'Update failed' });
    }
    console.log(stdout);
    res.json({ reply: stdout.trim() });
  });
});

app.get('/api/models', async (req, res) => {
  try {
    const models = await listModels();
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static('public'));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
