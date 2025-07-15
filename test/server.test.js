const request = require('supertest');
jest.mock('openai');
const OpenAI = require('openai');

// Prepare a single OpenAI instance whose behaviour can be customised per test.
const createMock = jest.fn();
const openaiInstance = { chat: { completions: { create: createMock } } };
OpenAI.mockImplementation(() => openaiInstance);

let app;
let setEnv;

beforeEach(() => {
  jest.resetModules();
  ({ setEnv } = require('../openaiClient'));
  setEnv('openai');
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
    ({ setEnv } = require('../openaiClient'));
    setEnv('local');
    app = require('../server');
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toEqual(['device']);
    expect(broadcast).toHaveBeenCalledWith('hi');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('edits a file when message begins with CODE:', async () => {
    const fs = require('fs');
    const path = require('path');
    const target = path.join(__dirname, 'tmp.txt');
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'CODE:test/tmp.txt\nhello' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toMatch(/Updated/);
    const content = fs.readFileSync(target, 'utf8');
    expect(content).toBe('hello');
    fs.unlinkSync(target);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects invalid CODE paths', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'CODE:../outside.txt\nhello' });
    expect(res.statusCode).toBe(400);
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

