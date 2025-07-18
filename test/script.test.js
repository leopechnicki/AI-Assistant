/** @jest-environment jsdom */
const { setupChat } = require('../public/script');

global.fetch = jest.fn(() =>
  Promise.resolve({
    body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) }
  })
);

global.TextDecoder = class { decode(v){ return typeof v === 'string' ? v : Buffer.from(v).toString(); } };

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  fetch.mockClear();
  global.alert = jest.fn();
});

const flush = () => new Promise(r => setTimeout(r,0));

test('input disabled until provider selected', async () => {
  setupChat(document);
  await flush();
  const env = document.getElementById('env');
  expect(env.value).toBe('');
  expect(document.getElementById('input').disabled).toBe(true);
  env.value = 'openai';
  env.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  expect(document.getElementById('input').disabled).toBe(false);
});
