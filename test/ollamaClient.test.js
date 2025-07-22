const { Readable } = require('stream');
jest.mock('axios', () => ({ post: jest.fn() }));
const axios = require('axios');

function streamFor(lines) {
  const r = new Readable({ read() {} });
  lines.forEach(l => r.push(l + '\n'));
  r.push(null);
  return { data: r };
}

afterEach(() => {
  axios.post.mockReset();
});


test('sendMessageStream yields content', async () => {
  axios.post.mockResolvedValueOnce(streamFor([JSON.stringify({ message: { content: 'hello' } }), JSON.stringify({ done: true })]));
  const { sendMessageStream } = require('../ollamaClient');
  const parts = [];
  for await (const p of sendMessageStream('hi')) parts.push(p);
  expect(parts.join('')).toBe('hello');
});
