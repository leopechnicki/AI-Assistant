const express = require('express');

const morgan = require('morgan');

const app = express();

// Use more verbose logging
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
const {
  sendMessage,
  sendMessageStream,
  getEnv,
  listModels,
  generateCompletion,
  showModel
} = require('./openaiClient');
const { exec } = require('child_process');

function getShutdownCommand() {
  return process.platform === 'win32' ? 'shutdown /s /t 0' : 'shutdown -h now';
}

function isLocal(req) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

app.post('/api/chat/stream', async (req, res) => {
  const { message, env } = req.body;
  if (!message) {
    console.log('POST /api/chat/stream missing message');
    return res.status(400).json({ error: 'Message is required' });
  }
  if (!env || !['openai', 'ollama', 'local'].includes(env)) {
    console.log('POST /api/chat/stream missing or invalid provider');
    return res.status(400).json({ error: 'Provider is required' });
  }

  try {
    console.log(`POST /api/chat/stream: ${message}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    for await (const chunk of sendMessageStream(message, [], { env })) {
      res.write(`data: ${chunk}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error(`${env} stream failed`, err);
    res.write(`data: ${err.message}\n\n`);
    res.end();
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, env } = req.body;
  if (!message) {
    console.log('POST /api/chat missing message');
    return res.status(400).json({ error: 'Message is required' });
  }
  if (!env || !['openai', 'ollama', 'local'].includes(env)) {
    console.log('POST /api/chat missing or invalid provider');
    return res.status(400).json({ error: 'Provider is required' });
  }
  try {
    console.log(`POST /api/chat: ${message}`);
    const reply = await sendMessage(message, [], { env });
    console.log(`reply: ${reply}`);
    res.json({ reply });
  } catch (err) {
    console.error(`${env} request failed`, err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt, env } = req.body;
  if (!prompt) {
    console.log('POST /api/generate missing prompt');
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (env !== 'ollama') {
    console.log('POST /api/generate invalid env');
    return res.status(400).json({ error: 'env must be ollama' });
  }
  try {
    const reply = await generateCompletion(prompt, { env });
    res.json({ reply });
  } catch (err) {
    console.error('ollama generate failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/show', async (req, res) => {
  const { model } = req.body || {};
  try {
    const info = await showModel(model, { env: 'ollama' });
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
  if (getEnv() === 'openai') {
    return res.status(400).json({ error: 'File upload not supported in OpenAI mode' });
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
  const env = req.query.env;
  if (!env) {
    return res.status(400).json({ error: 'env is required' });
  }
  try {
    const models = await listModels(env);
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
