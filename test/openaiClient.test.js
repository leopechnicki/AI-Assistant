const OpenAI = require('openai');

jest.mock('openai');

OpenAI.mockImplementation(() => ({
  chat: {
    completions: {
      create: jest.fn(() =>
        Promise.resolve({ choices: [{ message: { content: 'unit reply' } }] })
      )
    }
  }
}));

const { sendMessage, analyzeScreen } = require('../openaiClient');

test('sendMessage returns text from openai', async () => {
  const reply = await sendMessage('hi');
  expect(reply).toBe('unit reply');
});

test('analyzeScreen returns text from openai', async () => {
  const reply = await analyzeScreen('data:image/png;base64,abc');
  expect(reply).toBe('unit reply');
});
