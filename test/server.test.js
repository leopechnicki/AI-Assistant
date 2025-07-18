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
  async function* gen() {
    yield { choices: [{ delta: { content: 'mock ' } }] };
    yield { choices: [{ delta: { content: 'reply' } }] };
  }
  createMock.mockResolvedValue(gen());
});

describe('POST /api/chat', () => {
  it('returns reply', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'hi', env: 'openai' });
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
    const res = await request(app).post('/api/chat').send({ message: 'hi', env: 'local' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBe('device');
    expect(broadcast).toHaveBeenCalledWith('hi');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('requires message', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 413 for large payloads', async () => {
    const bigMessage = 'a'.repeat(1024 * 2100); // >2 MB
    const res = await request(app).post('/api/chat').send({ message: bigMessage, env: 'openai' });
    expect(res.statusCode).toBe(413);
  });

  it('returns 500 when OpenAI fails', async () => {
    createMock.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/api/chat').send({ message: 'hi', env: 'openai' });
    expect(res.statusCode).toBe(500);
  });
});

describe('POST /api/chat/stream', () => {
  it('streams reply', async () => {
    async function* gen() {
      yield { choices: [{ delta: { content: 'a' } }] };
      yield { choices: [{ delta: { content: 'b' } }] };
    }
    createMock.mockResolvedValueOnce(gen());
    const res = await request(app)
      .post('/api/chat/stream')
      .send({ message: 'hi', env: 'openai' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('data: a');
    expect(res.text).toContain('data: b');
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


  it('rejects file upload in openai mode', async () => {
    const res = await request(app)
      .post('/api/file')
      .send({ name: 'a.txt', content: 'data' });
    expect(res.statusCode).toBe(400);
  });

  it('accepts file upload in ollama mode', async () => {
    jest.resetModules();
    ({ setEnv, setClientFactory } = require('../openaiClient'));
    setEnv('ollama');
    setClientFactory(() => openaiInstance);
    app = require('../server');
    const res = await request(app)
      .post('/api/file')
      .send({ name: 'a.txt', content: 'data' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toContain('Received file');
  });

  it('shuts down the server host', async () => {
    const exec = jest.fn((cmd, cb) => cb(null));
    jest.doMock('child_process', () => ({ exec }));
    jest.resetModules();
    ({ setClientFactory } = require('../openaiClient'));
    setClientFactory(() => openaiInstance);
    app = require('../server');
    const res = await request(app).post('/api/shutdown');
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBe('Shutting down...');
    expect(exec).toHaveBeenCalled();
  });

  it('returns 500 when shutdown fails', async () => {
    const exec = jest.fn((cmd, cb) => cb(new Error('fail')));
    jest.doMock('child_process', () => ({ exec }));
    jest.resetModules();
    ({ setClientFactory } = require('../openaiClient'));
    setClientFactory(() => openaiInstance);
    app = require('../server');
    const res = await request(app).post('/api/shutdown');
    expect(res.statusCode).toBe(500);
    expect(exec).toHaveBeenCalled();
  });
});

describe('GET /api/models', () => {
  beforeEach(() => {
    jest.resetModules();
    ({ setClientFactory } = require('../openaiClient'));
    setClientFactory(() => openaiInstance);
    app = require('../server');
  });

  it('lists models for openai', async () => {
    const list = jest.fn().mockResolvedValue({ data: [{ id: 'a' }] });
    openaiInstance.models = { list };
    const res = await request(app).get('/api/models').query({ env: 'openai' });
    expect(res.statusCode).toBe(200);
    expect(res.body.models).toContain('a');
  });

  it('handles errors', async () => {
    const list = jest.fn().mockRejectedValue(new Error('fail'));
    openaiInstance.models = { list };
    const res = await request(app).get('/api/models').query({ env: 'openai' });
    expect(res.statusCode).toBe(500);
  });
});

