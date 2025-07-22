const mockChat = jest.fn();
const mockGenerate = jest.fn();
const mockShow = jest.fn();
jest.mock('ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({
    chat: mockChat,
    generate: mockGenerate,
    show: mockShow
  }))
}));

afterEach(() => {
  mockChat.mockReset();
  mockGenerate.mockReset();
  mockShow.mockReset();
});


test('sendMessageStream yields content', async () => {
  async function* gen() { yield { message: { content: 'hello' } }; }
  mockChat.mockReturnValueOnce(gen());
  const { sendMessageStream } = require('../ollamaClient');
  const parts = [];
  for await (const p of sendMessageStream('hi')) parts.push(p);
  expect(parts.join('')).toBe('hello');
});
