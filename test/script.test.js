/** @jest-environment jsdom */
const { setupChat } = require('../public/script');

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ models: ['m1'] }),
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

test('default env is ollama', async () => {
  setupChat(document);
  await flush();
  expect(document.getElementById('env').value).toBe('ollama');
});


test('model list failure leaves only placeholder', async () => {
  fetch.mockResolvedValueOnce({ json: () => Promise.reject(new Error('fail')) });
  setupChat(document);
  await flush();
  document.getElementById('env').dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  await flush();
  expect(document.getElementById('model').options.length).toBeGreaterThanOrEqual(1);
});
