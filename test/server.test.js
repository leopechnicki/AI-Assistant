const request = require('supertest');
jest.mock('openai');
const OpenAI = require('openai');

// Prepare a single OpenAI instance whose behaviour can be customised per test.
const createMock = jest.fn();
const openaiInstance = { chat: { completions: { create: createMock } } };
OpenAI.mockImplementation(() => openaiInstance);

let app;
let setEnv, setClientFactory;

beforeEach(() => {
  jest.resetModules();
  ({ setEnv, setClientFactory } = require('../openaiClient'));
  setEnv('openai');
  setClientFactory(() => openaiInstance);
  app = require('../server');
});

beforeEach(() => {
  createMock.mockReset();
  createMock.mockResolvedValue({
    choices: [{ message: { content: 'mock reply' } }]
  });
});

describe('POST /api/chat', () => {
  it('returns reply', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBe('mock reply');
  });

  it('returns MCP reply in local mode', async () => {
    setEnv('local');
    const broadcast = jest.fn().mockResolvedValue(['device']);
    jest.doMock('../mcp', () => {
      return jest.fn().mockImplementation(() => ({ broadcast }));
    });
    jest.resetModules();
    ({ setEnv, setClientFactory } = require('../openaiClient'));
    setEnv('local');
    setClientFactory(() => openaiInstance);
    app = require('../server');
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toEqual(['device']);
    expect(broadcast).toHaveBeenCalledWith('hi');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('requires message', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 413 for large payloads', async () => {
    const bigMessage = 'a'.repeat(1024 * 2100); // >2 MB
    const res = await request(app).post('/api/chat').send({ message: bigMessage });
    expect(res.statusCode).toBe(413);
  });

  it('returns 500 when OpenAI fails', async () => {
    createMock.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.statusCode).toBe(500);
  });
});

describe('additional routes', () => {
  beforeEach(() => {
    jest.resetModules();
    ({ setClientFactory } = require('../openaiClient'));
    setClientFactory(() => openaiInstance);
    app = require('../server');
  });

  it('returns 404 for removed audio route', async () => {
    const res = await request(app)
      .post('/api/audio')
      .send({ audio: 'testdata' });
    expect(res.statusCode).toBe(404);
  });

  it('connects via bluetooth', async () => {
    const connectBluetooth = jest.fn().mockResolvedValue('ok');
    jest.doMock('../mcp', () => {
      return jest.fn().mockImplementation(() => ({ connectBluetooth }));
    });
    jest.resetModules();
    ({ setClientFactory } = require('../openaiClient'));
    setClientFactory(() => openaiInstance);
    app = require('../server');
    const res = await request(app)
      .post('/api/connect')
      .send({ address: 'AA:BB' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBe('ok');
    expect(connectBluetooth).toHaveBeenCalledWith('AA:BB');
  });
});

