const request = require('supertest');

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: {} })) }));

let app;
jest.mock('../ollamaWrapper', () => ({ runOllamaChat: jest.fn() }));

beforeEach(() => {
  jest.resetModules();
  const client = require('../ollamaClient');
  client.sendMessage = jest.fn().mockResolvedValue('ok');
  client.sendMessageStream = jest.fn(async function* (){});
  const wrapper = require('../ollamaWrapper');
  wrapper.runOllamaChat.mockResolvedValue({ content: 'ok' });
  process.env.WEATHER_API_KEY = 'test';
  app = require('../server');
});

test('POST /api/chat returns reply', async () => {
  const wrapper = require('../ollamaWrapper');
  wrapper.runOllamaChat.mockResolvedValue({ content: 'ok' });
  const res = await request(app).post('/api/chat').send({ message: 'hi' });
  expect(res.statusCode).toBe(200);
  expect(res.body.reply).toBe('ok');
  expect(wrapper.runOllamaChat).toHaveBeenCalled();
});

test('POST /api/chat/stream streams reply', async () => {
  const client = require('../ollamaClient');
  async function* gen(){ yield 'hi'; }
  client.sendMessageStream.mockImplementation(() => gen());
  const res = await request(app).post('/api/chat/stream').send({ message: 'hi' });
  expect(res.statusCode).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  expect(res.text).toContain('data: hi');
});

test('file upload accepted', async () => {
  const res = await request(app).post('/api/file').send({ name: 'a.txt', content: 'data' });
  expect(res.statusCode).toBe(200);
  expect(res.body.reply).toContain('Received file');
});
