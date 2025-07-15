const request = require('supertest');
jest.mock('openai');
const OpenAI = require('openai');

// Prepare a single OpenAI instance whose behaviour can be customised per test.
const createMock = jest.fn();
const openaiInstance = { chat: { completions: { create: createMock } } };
OpenAI.mockImplementation(() => openaiInstance);

const app = require('../server');

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

  it('requires message', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 413 for large payloads', async () => {
    const bigMessage = 'a'.repeat(1024 * 200); // 200 KB
    const res = await request(app).post('/api/chat').send({ message: bigMessage });
    expect(res.statusCode).toBe(413);
  });

  it('returns 500 when OpenAI fails', async () => {
    createMock.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.statusCode).toBe(500);
  });
});

describe('POST /api/screen', () => {
  it('returns reply', async () => {
    const res = await request(app).post('/api/screen').send({ image: 'data:image/png;base64,abc' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBe('mock reply');
  });

  it('requires image', async () => {
    const res = await request(app).post('/api/screen').send({});
    expect(res.statusCode).toBe(400);
  });

  it('returns 413 for large payloads', async () => {
    const bigImage = 'data:image/png;base64,' + 'a'.repeat(1024 * 200);
    const res = await request(app).post('/api/screen').send({ image: bigImage });
    expect(res.statusCode).toBe(413);
  });

  it('returns 500 when OpenAI fails', async () => {
    createMock.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).post('/api/screen').send({ image: 'data:image/png;base64,abc' });
    expect(res.statusCode).toBe(500);
  });
});

