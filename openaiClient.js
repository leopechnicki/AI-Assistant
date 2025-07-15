const OpenAI = require('openai');
// Instantiate the OpenAI client using the modern API. The API key is pulled
// from the environment variable OPENAI_API_KEY, which mirrors the default
// behaviour of the library but keeps it explicit for clarity.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function sendMessage(message) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }]
  });
  return completion.choices[0].message.content;
}

module.exports = { sendMessage };
