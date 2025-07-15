jest.mock('openai');

const OpenAI = require('openai');

const createMock = jest.fn();
const transcribeMock = jest.fn();
const openaiInstance = {
  chat: { completions: { create: createMock } },
  audio: { transcriptions: { create: transcribeMock } }
};
OpenAI.mockImplementation(() => openaiInstance);

beforeEach(() => {
  createMock.mockReset();
  transcribeMock.mockReset();
  createMock.mockResolvedValue({
    choices: [{ message: { content: 'unit reply' } }]
  });
  transcribeMock.mockResolvedValue({ text: 'audio text' });
});

let sendMessage, setEnv, setClientFactory, transcribeAudio;

beforeEach(() => {
  jest.resetModules();
  ({ sendMessage, setEnv, setClientFactory, transcribeAudio } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
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
  ({ sendMessage, setEnv, setClientFactory } = require('../openaiClient'));
  setClientFactory(() => openaiInstance);
  setEnv('local');
  const reply = await sendMessage('hi');
  expect(broadcast).toHaveBeenCalledWith('hi');
  expect(reply).toEqual(['ok']);
});


test('sendMessage throws when openai fails', async () => {
  createMock.mockRejectedValueOnce(new Error('fail'));
  await expect(sendMessage('hi')).rejects.toThrow('fail');
});

test('transcribeAudio returns text from openai', async () => {
  const res = await transcribeAudio(Buffer.from('a'));
  expect(transcribeMock).toHaveBeenCalled();
  expect(res).toBe('audio text');
});

