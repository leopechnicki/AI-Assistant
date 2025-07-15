const request = require('supertest');
jest.mock('openai');
const OpenAI = require('openai');

OpenAI.mockImplementation(() => ({
  chat: {
    completions: {
      create: jest.fn(() =>
        Promise.resolve({ choices: [{ message: { content: 'mock reply' } }] })
      )
    }
  }
}));

const app = require('../server');

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
});

