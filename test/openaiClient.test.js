const OpenAI = require('openai');

jest.mock('openai');

const createMock = jest.fn();
const openaiInstance = { chat: { completions: { create: createMock } } };
OpenAI.mockImplementation(() => openaiInstance);

beforeEach(() => {
  createMock.mockReset();
  createMock.mockResolvedValue({
    choices: [{ message: { content: 'unit reply' } }]
  });
});

const { sendMessage } = require('../openaiClient');

test('sendMessage returns text from openai', async () => {
  const reply = await sendMessage('hi');
  expect(reply).toBe('unit reply');
});


test('sendMessage throws when openai fails', async () => {
  createMock.mockRejectedValueOnce(new Error('fail'));
  await expect(sendMessage('hi')).rejects.toThrow('fail');
});

