jest.mock('openai');

const OpenAI = require('openai');

const createMock = jest.fn();
const openaiInstance = { chat: { completions: { create: createMock } } };
OpenAI.mockImplementation(() => openaiInstance);

global.fetch = jest.fn();

beforeEach(() => {
  createMock.mockReset();
  createMock.mockResolvedValue({
    choices: [{ message: { content: 'unit reply' } }]
  });
  fetch.mockReset();
});

let sendMessage, sendMessageStream, setEnv, setClientFactory;

beforeEach(() => {
  jest.resetModules();
  ({ sendMessage, sendMessageStream, setEnv, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
});

test('sendMessage returns text from openai', async () => {
  async function* gen() {
    yield { choices: [{ delta: { content: 'unit ' } }] };
    yield { choices: [{ delta: { content: 'reply' } }] };
  }
  createMock.mockResolvedValueOnce(gen());
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
  ({ sendMessage, setEnv, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
  setEnv('local');
  const reply = await sendMessage('hi');
  expect(broadcast).toHaveBeenCalledWith('hi');
  expect(reply).toBe('ok');
});


test('sendMessage throws when openai fails', async () => {
  createMock.mockRejectedValueOnce(new Error('fail'));
  await expect(sendMessage('hi')).rejects.toThrow('fail');
});

test('sendMessageStream yields tokens', async () => {
  async function* gen() {
    yield { choices: [{ delta: { content: 'he' } }] };
    yield { choices: [{ delta: { content: 'llo' } }] };
  }
  createMock.mockResolvedValueOnce(gen());
  const parts = [];
  for await (const p of sendMessageStream('hi')) {
    parts.push(p);
  }
  expect(parts.join('')).toBe('hello');
});

test('sendMessageStream uses MCP when env is local', async () => {
  setEnv('local');
  const broadcast = jest.fn().mockResolvedValue(['ok']);
  jest.doMock('../mcp', () => {
    return jest.fn().mockImplementation(() => ({ broadcast }));
  });
  jest.resetModules();
  ({ sendMessageStream, setEnv, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
  setEnv('local');
  const parts = [];
  for await (const p of sendMessageStream('hi')) {
    parts.push(p);
  }
  expect(broadcast).toHaveBeenCalledWith('hi');
  expect(parts.join('')).toBe('ok');
});

test('sendMessage uses Ollama when env is ollama', async () => {
  setEnv('ollama');
  const { Readable } = require('stream');
  const body = Readable.from([
    Buffer.from(JSON.stringify({ message: { content: 'he' } }) + '\n'),
    Buffer.from(JSON.stringify({ message: { content: 'y' } }) + '\n')
  ]);
  fetch.mockResolvedValueOnce({ body });
  const reply = await sendMessage('hi');
  expect(fetch).toHaveBeenCalled();
  expect(reply).toBe('hey');
});

test('sendMessageStream uses Ollama when env is ollama', async () => {
  setEnv('ollama');
  const { Readable } = require('stream');
  const body = Readable.from([
    Buffer.from(JSON.stringify({ message: { content: 'he' } }) + '\n'),
    Buffer.from(JSON.stringify({ message: { content: 'llo' } }) + '\n')
  ]);
  fetch.mockResolvedValueOnce({ body });
  const parts = [];
  for await (const p of sendMessageStream('hi')) {
    parts.push(p);
  }
  expect(fetch).toHaveBeenCalled();
  expect(parts.join('')).toBe('hello');
});

