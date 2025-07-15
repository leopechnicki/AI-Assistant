/** @jest-environment jsdom */

const { setupChat } = require('../public/script');

global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({ reply: 'server reply' }) })
);

beforeEach(() => {
  document.body.innerHTML = `<div id="app"></div>`;
  fetch.mockClear();
});

test('pressing Enter sends the message', async () => {
  setupChat(document);
  await new Promise(r => setTimeout(r, 0));
  const input = document.getElementById('input');
  input.value = 'hello';
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
  input.dispatchEvent(event);
  await new Promise(r => setTimeout(r, 0));
  expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
});
