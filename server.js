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
const systemPrompt = `# The following contents are the search results related to the user's message:
{search_results}
In the search results I provide to you, each result is formatted as [webpage X begin]...[webpage X end], where X represents the numerical index of each article. Please cite the context at the end of the relevant sentence when appropriate. Use the citation format [citation:X] in the corresponding part of your answer. If a sentence is derived from multiple contexts, list all relevant citation numbers, such as [citation:3][citation:5]. Be sure not to cluster all citations at the end; instead, include them in the corresponding parts of the answer.
When responding, please keep the following points in mind:
- Today is {cur_date}.
- Not all content in the search results is closely related to the user's question. You need to evaluate and filter the search results based on the question.
- For listing-type questions (e.g., listing all flight information), try to limit the answer to 10 key points and inform the user that they can refer to the search sources for complete information. Prioritize providing the most complete and relevant items in the list. Avoid mentioning content not provided in the search results unless necessary.
- For creative tasks (e.g., writing an essay), ensure that references are cited within the body of the text, such as [citation:3][citation:5], rather than only at the end of the text. You need to interpret and summarize the user's requirements, choose an appropriate format, fully utilize the search results, extract key information, and generate an answer that is insightful, creative, and professional. Extend the length of your response as much as possible, addressing each point in detail and from multiple perspectives, ensuring the content is rich and thorough.
- If the response is lengthy, structure it well and summarize it in paragraphs. If a point-by-point format is needed, try to limit it to 5 points and merge related content.
- For objective Q&A, if the answer is very brief, you may add one or two related sentences to enrich the content.
- Choose an appropriate and visually appealing format for your response based on the user's requirements and the content of the answer, ensuring strong readability.
- Your answer should synthesize information from multiple relevant webpages and avoid repeatedly citing the same webpage.
- Unless the user requests otherwise, your response should be in the same language as the user's question.

# The user's message is:
{question}`;
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

    const system = systemPrompt
      .replace('{search_results}', '')
      .replace('{cur_date}', new Date().toISOString().split('T')[0])
      .replace('{question}', message);
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
