const express = require('express');

const morgan = require('morgan');

const app = express();

app.use(morgan('tiny'));
app.use(express.json({ limit: '2mb' }));
const { sendMessage } = require('./openaiClient');
const MCP = require('./mcp');
const mcp = new MCP();

const clients = [];


app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    const reply = await sendMessage(message);
    res.json({ reply });
    broadcast({ reply });
  } catch (err) {
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

app.post('/api/audio', async (req, res) => {
  const { audio } = req.body;
  if (!audio) return res.status(400).json({ error: 'Audio is required' });
  res.json({ reply: 'Audio received' });
});

app.post('/api/connect', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address is required' });
  try {
    const result = await mcp.connectBluetooth(address);
    res.json({ reply: result });
  } catch (err) {
    res.status(500).json({ error: 'Connection failed' });
  }
});

app.get('/api/live', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  clients.push(res);
  req.on('close', () => {
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
  });
});

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

app.use(express.static('public'));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
