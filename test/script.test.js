/** @jest-environment jsdom */

const { setupChat } = require('../public/script');

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ reply: 'server reply' }),
    body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) }
  })
);

global.TextDecoder = class {
  decode(v) { return typeof v === 'string' ? v : Buffer.from(v).toString(); }
};

beforeEach(() => {
  document.body.innerHTML = `<div id="app"></div>`;
  fetch.mockClear();
  global.confirm = jest.fn(() => true);
});

test('pressing Enter sends the message', async () => {
  setupChat(document);
  await new Promise(r => setTimeout(r, 0));
  const input = document.getElementById('input');
  input.value = 'hello';
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
  input.dispatchEvent(event);
  await new Promise(r => setTimeout(r, 0));
  expect(fetch).toHaveBeenCalledWith('/api/chat/stream', expect.objectContaining({ method: 'POST' }));
});

test('clicking shutdown sends request', async () => {
  setupChat(document);
  await new Promise(r => setTimeout(r, 0));
  const button = document.getElementById('shutdown');
  button.click();
  await new Promise(r => setTimeout(r, 0));
  expect(confirm).toHaveBeenCalledWith('Are you sure\u2026?');
  expect(fetch).toHaveBeenCalledWith('/api/shutdown', expect.objectContaining({ method: 'POST' }));
});

test('clicking reset starts a new conversation', async () => {
  setupChat(document);
  await new Promise(r => setTimeout(r, 0));
  const input = document.getElementById('input');
  input.value = 'hi';
  document.getElementById('send').click();
  await new Promise(r => setTimeout(r, 0));
  expect(document.querySelectorAll('#messages .msg').length).toBeGreaterThan(0);
  const reset = document.getElementById('reset');
  reset.click();
  await new Promise(r => setTimeout(r, 0));
  expect(document.querySelectorAll('#messages .msg').length).toBe(0);
});

test('clicking clear removes messages with confirm', async () => {
  setupChat(document);
  await new Promise(r => setTimeout(r, 0));
  const input = document.getElementById('input');
  input.value = 'hi';
  document.getElementById('send').click();
  await new Promise(r => setTimeout(r, 0));
  expect(document.querySelectorAll('#messages .msg').length).toBeGreaterThan(0);
  const clear = document.getElementById('clear');
  clear.click();
  await new Promise(r => setTimeout(r, 0));
  expect(confirm).toHaveBeenCalledWith('Delete all messages?');
  expect(document.querySelectorAll('#messages .msg').length).toBe(0);
});
