const express = require('express');
const app = express();
app.use(express.json());
const { sendMessage } = require('./openaiClient');

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    const reply = await sendMessage(message);
    res.json({ reply });
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
