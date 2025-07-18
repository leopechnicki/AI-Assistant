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
  process.env.OLLAMA_MODEL = 'MFDoom/deepseek-r1-tool-calling:8b';
  axios = require('axios');
  postMock = axios.post;
  ({ sendMessage, sendMessageStream, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
});

test('sendMessage returns text from openai', async () => {
  createMock.mockResolvedValueOnce({ choices: [{ message: { content: 'unit reply' } }] });
  const reply = await sendMessage('hi', [], { env: 'openai' });
  expect(createMock).toHaveBeenCalledWith({
    model: 'gpt-3.5-turbo-1106',
    messages: [{ role: 'user', content: 'hi' }],
    tools: expect.any(Array),
    tool_choice: 'auto',
    stream: false
  });
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

test('sendMessageStream returns openai reply', async () => {
  createMock.mockResolvedValueOnce({ choices: [{ message: { content: 'hello' } }] });
  const parts = [];
  for await (const p of sendMessageStream('hi', [], { env: 'openai' })) {
    parts.push(p);
  }
  expect(createMock).toHaveBeenCalledWith({
    model: 'gpt-3.5-turbo-1106',
    messages: [{ role: 'user', content: 'hi' }],
    tools: expect.any(Array),
    tool_choice: 'auto',
    stream: false
  });
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
  expect(postMock.mock.calls[0][1].model).toBe('MFDoom/deepseek-r1-tool-calling:8b');
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
  expect(postMock.mock.calls[0][1].model).toBe('MFDoom/deepseek-r1-tool-calling:8b');
  expect(postMock.mock.calls[0][1].tools.find(t => t.function.name === 'search_web')).toBeTruthy();
  expect(parts.join('')).toBe('hello');
});

test('sendMessage requires provider', async () => {
  await expect(sendMessage('hi')).rejects.toThrow('Provider is required');
});

test('ollama errors do not fallback', async () => {
  postMock.mockRejectedValueOnce(new Error('boom'));
  await expect(sendMessage('hi', [], { env: 'ollama' })).rejects.toThrow('Ollama request failed');
  expect(createMock).not.toHaveBeenCalled();
});

test('openai tool calls are executed', async () => {
  createMock
    .mockResolvedValueOnce({
      choices: [{ message: { tool_calls: [{ id: '1', function: { name: 'send_email', arguments: '{"to":"a@b","subject":"s","body":"b"}' } }] } }]
    })
    .mockResolvedValueOnce({ choices: [{ message: { content: 'done' } }] });

  const reply = await sendMessage('hi', [], { env: 'openai' });
  expect(reply).toBe('done');
  expect(createMock.mock.calls[0][0].model).toBe('gpt-3.5-turbo-1106');
  expect(createMock.mock.calls[0][0].tools).toBeDefined();
  const toolMsg = createMock.mock.calls[1][0].messages.find(m => m.role === 'tool');
  expect(toolMsg).toBeTruthy();
});

test('generateCompletion uses ollama generate endpoint', async () => {
  postMock.mockResolvedValueOnce({ data: { response: 'hello' } });
  const { generateCompletion } = require('../openaiClient');
  const res = await generateCompletion('hi', { env: 'ollama' });
  expect(postMock).toHaveBeenCalledWith(
    'http://localhost:11434/api/generate',
    expect.objectContaining({ model: 'MFDoom/deepseek-r1-tool-calling:8b', prompt: 'hi', stream: false })
  );
  expect(res).toBe('hello');
});

test('showModel fetches model info', async () => {
  postMock.mockResolvedValueOnce({ data: { modelfile: 'abc' } });
  const { showModel } = require('../openaiClient');
  const info = await showModel('m1', { env: 'ollama' });
  expect(postMock).toHaveBeenCalledWith('http://localhost:11434/api/show', { model: 'm1' });
  expect(info.modelfile).toBe('abc');
});

