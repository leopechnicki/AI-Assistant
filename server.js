const express = require('express');

const morgan = require('morgan');

const app = express();

// Use more verbose logging
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
const { sendMessage, transcribeAudio } = require('./openaiClient');
const MCP = require('./mcp');
const mcp = new MCP();

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    console.log('POST /api/chat missing message');
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    console.log(`POST /api/chat: ${message}`);
    const reply = await sendMessage(message);
    console.log(`reply: ${reply}`);
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI request failed', err);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

app.post('/api/audio', async (req, res) => {
  const { audio } = req.body;
  if (!audio) {
    console.log('POST /api/audio missing audio');
    return res.status(400).json({ error: 'Audio is required' });
  }
  try {
    const buffer = Buffer.from(audio, 'base64');
    const reply = await transcribeAudio(buffer);
    res.json({ reply });
  } catch (err) {
    console.error('Audio transcription failed', err);
    res.status(500).json({ error: 'Audio transcription failed' });
  }
});

app.post('/api/connect', async (req, res) => {
  const { address } = req.body;
  if (!address) {
    console.log('POST /api/connect missing address');
    return res.status(400).json({ error: 'Address is required' });
  }
  try {
    console.log(`Connecting to ${address}`);
    const result = await mcp.connectBluetooth(address);
    console.log('connected');
    res.json({ reply: result });
  } catch (err) {
    console.error('Connection failed', err);
    res.status(500).json({ error: 'Connection failed' });
  }
});

app.use(express.static('public'));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
