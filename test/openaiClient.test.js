jest.mock('openai');
jest.mock('axios', () => ({ post: jest.fn() }));

const OpenAI = require('openai');
let axios = require('axios');
let postMock = axios.post;

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
  postMock.mockReset();
});

let sendMessage, sendMessageStream, setClientFactory;

beforeEach(() => {
  jest.resetModules();
  axios = require('axios');
  postMock = axios.post;
  ({ sendMessage, sendMessageStream, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
});

test('sendMessage returns text from openai', async () => {
  async function* gen() {
    yield { choices: [{ delta: { content: 'unit ' } }] };
    yield { choices: [{ delta: { content: 'reply' } }] };
  }
  createMock.mockResolvedValueOnce(gen());
  const reply = await sendMessage('hi', [], { env: 'openai' });
  expect(reply).toBe('unit reply');
});

test('sendMessage uses MCP when env is local', async () => {
  const broadcast = jest.fn().mockResolvedValue(['ok']);
  jest.doMock('../mcp', () => {
    return jest.fn().mockImplementation(() => ({ broadcast }));
  });
  jest.resetModules();
  ({ sendMessage, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
  const reply = await sendMessage('hi', [], { env: 'local' });
  expect(broadcast).toHaveBeenCalledWith('hi');
  expect(reply).toBe('ok');
});


test('sendMessage throws when openai fails', async () => {
  createMock.mockRejectedValueOnce(new Error('fail'));
  await expect(sendMessage('hi', [], { env: 'openai' })).rejects.toThrow('fail');
});

test('sendMessageStream yields tokens', async () => {
  async function* gen() {
    yield { choices: [{ delta: { content: 'he' } }] };
    yield { choices: [{ delta: { content: 'llo' } }] };
  }
  createMock.mockResolvedValueOnce(gen());
  const parts = [];
  for await (const p of sendMessageStream('hi', [], { env: 'openai' })) {
    parts.push(p);
  }
  expect(parts.join('')).toBe('hello');
});

test('sendMessageStream uses MCP when env is local', async () => {
  const broadcast = jest.fn().mockResolvedValue(['ok']);
  jest.doMock('../mcp', () => {
    return jest.fn().mockImplementation(() => ({ broadcast }));
  });
  jest.resetModules();
  ({ sendMessageStream, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
  const parts = [];
  for await (const p of sendMessageStream('hi', [], { env: 'local' })) {
    parts.push(p);
  }
  expect(broadcast).toHaveBeenCalledWith('hi');
  expect(parts.join('')).toBe('ok');
});

test('sendMessage uses Ollama when env is ollama', async () => {
  postMock.mockResolvedValueOnce({ data: { message: { content: 'hey' } } });
  const reply = await sendMessage('hi', [], { env: 'ollama' });
  expect(postMock).toHaveBeenCalled();
  expect(postMock.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
  expect(postMock.mock.calls[0][1].tools).toBeDefined();
  expect(postMock.mock.calls[0][1].tools.find(t => t.function.name === 'search_web')).toBeTruthy();
  expect(reply).toBe('hey');
});

test('sendMessageStream uses Ollama when env is ollama', async () => {
  postMock.mockResolvedValueOnce({ data: { message: { content: 'hello' } } });
  const parts = [];
  for await (const p of sendMessageStream('hi', [], { env: 'ollama' })) {
    parts.push(p);
  }
  expect(postMock).toHaveBeenCalled();
  expect(postMock.mock.calls[0][1].tools.find(t => t.function.name === 'search_web')).toBeTruthy();
  expect(parts.join('')).toBe('hello');
});

