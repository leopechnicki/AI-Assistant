const MCP = require('../mcp');

global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockReset();
  fetch.mockResolvedValue('ok');
});

test('broadcast sends message to all devices', async () => {
  const devices = [
    { host: 'a', port: 1 },
    { host: 'b', port: 2 }
  ];
  const mcp = new MCP(devices);
  const res = await mcp.broadcast('hello');
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith('http://a:1/message', expect.any(Object));
  expect(fetch).toHaveBeenCalledWith('http://b:2/message', expect.any(Object));
  expect(res).toHaveLength(2);
});

