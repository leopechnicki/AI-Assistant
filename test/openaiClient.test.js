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

let sendMessage, setEnv;

beforeEach(() => {
  jest.resetModules();
  ({ sendMessage, setEnv } = require('../openaiClient'));
});

test('sendMessage returns text from openai', async () => {
  const reply = await sendMessage('hi');
  expect(reply).toBe('unit reply');
});

test('sendMessage uses MCP when env is local', async () => {
  setEnv('local');
  const broadcast = jest.fn().mockResolvedValue(['ok']);
  jest.doMock('../mcp', () => {
    return jest.fn().mockImplementation(() => ({ broadcast }));
  });
  jest.resetModules();
  ({ sendMessage, setEnv } = require('../openaiClient'));
  const reply = await sendMessage('hi');
  expect(broadcast).toHaveBeenCalledWith('hi');
  expect(reply).toEqual(['ok']);
});


test('sendMessage throws when openai fails', async () => {
  createMock.mockRejectedValueOnce(new Error('fail'));
  await expect(sendMessage('hi')).rejects.toThrow('fail');
});

