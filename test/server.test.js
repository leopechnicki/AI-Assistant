const request = require('supertest');
const app = require('../server');

jest.mock('openai', () => {
  return {
    Configuration: jest.fn(() => ({})),
    OpenAIApi: jest.fn(() => ({
      createChatCompletion: jest.fn(() => Promise.resolve({
        data: { choices: [{ message: { content: 'mock reply' } }] }
      }))
    }))
  };
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
});
