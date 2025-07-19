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
  console.error = jest.fn();
});

const flush = () => new Promise(r => setTimeout(r,0));

test('think checkbox enabled by default', async () => {
  setupChat(document);
  await flush();
  document.getElementById('settings-btn').click();
  await flush();
  const cb = document.querySelector('input[type="checkbox"]');
  expect(cb.checked).toBe(true);
});

test('settings menu toggles', async () => {
  setupChat(document);
  await flush();
  const btn = document.getElementById('settings-btn');
  expect(document.getElementById('settings-menu')).toBeNull();
  btn.click();
  await flush();
  expect(document.getElementById('settings-menu')).not.toBeNull();
});
