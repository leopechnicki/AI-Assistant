jest.mock('openai', () => ({
  Configuration: jest.fn(() => ({})),
  OpenAIApi: jest.fn(() => ({
    createChatCompletion: jest.fn(() => Promise.resolve({
      data: { choices: [{ message: { content: 'unit reply' } }] }
    }))
  }))
}));

const { sendMessage } = require('../openaiClient');

test('sendMessage returns text from openai', async () => {
  const reply = await sendMessage('hi');
  expect(reply).toBe('unit reply');
});
