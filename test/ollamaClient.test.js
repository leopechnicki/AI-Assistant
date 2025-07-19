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

test('tool calling flow', async () => {
  axios.post
    .mockResolvedValueOnce(streamFor([JSON.stringify({ message: { tool_calls: [{ id: '1', type: 'function', function: { name: 'send_email', arguments: '{"to":"a","subject":"s","body":"b"}' } }] } }), JSON.stringify({ done: true })]))
    .mockResolvedValueOnce(streamFor([JSON.stringify({ message: { content: 'done' } }), JSON.stringify({ done: true })]));
  const { sendMessage } = require('../ollamaClient');
  const reply = await sendMessage('hi', [], { env: 'ollama' });
  expect(reply).toBe('done');
  expect(axios.post).toHaveBeenCalledTimes(2);
  expect(axios.post.mock.calls[0][1].stream).toBe(true);
  expect(axios.post.mock.calls[1][1].stream).toBe(true);
});

test('sendMessageStream yields content', async () => {
  axios.post.mockResolvedValueOnce(streamFor([JSON.stringify({ message: { content: 'hello' } }), JSON.stringify({ done: true })]));
  const { sendMessageStream } = require('../ollamaClient');
  const parts = [];
  for await (const p of sendMessageStream('hi', [], { env: 'ollama' })) parts.push(p);
  expect(parts.join('')).toBe('hello');
});
