const express = require('express');

const fs = require('fs').promises;
const path = require('path');

const morgan = require('morgan');

const app = express();

app.use(morgan('tiny'));
app.use(express.json({ limit: '2mb' }));
const { sendMessage, analyzeScreen } = require('./openaiClient');


app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    if (message.startsWith('CODE:')) {
      const [header, ...lines] = message.split('\n');
      const file = header.slice(5).trim();
      const code = lines.join('\n');

      if (!file) return res.status(400).json({ error: 'File path required' });

      const target = path.resolve(__dirname, file);
      if (!target.startsWith(__dirname)) {
        return res.status(400).json({ error: 'Invalid path' });
      }

      await fs.writeFile(target, code);
      res.json({ reply: `Updated ${file}` });
    } else {
      const reply = await sendMessage(message);
      res.json({ reply });
    }
  } catch (err) {
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

app.use(express.static('public'));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
