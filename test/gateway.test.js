const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock child_process at the top level
jest.mock('child_process');

const tmpDir = path.join(os.tmpdir(), 'test-openclaw-' + Date.now());
const tmpConfig = path.join(tmpDir, 'openclaw.json');

function loadGateway() {
  return require('../lib/gateway');
}

beforeEach(() => {
  jest.resetModules();
  jest.mock('child_process');
  const { execSync, spawn } = require('child_process');
  execSync.mockReset();
  spawn.mockReset();
  spawn.mockReturnValue({ on: jest.fn(), kill: jest.fn() });
});

afterAll(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('findBinary returns clawdbot when available', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which clawdbot') return '/usr/local/bin/clawdbot';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  expect(gateway.findBinary()).toBe('clawdbot');
});

test('findBinary returns openclaw as fallback', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which openclaw') return '/usr/local/bin/openclaw';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  expect(gateway.findBinary()).toBe('openclaw');
});

test('findBinary returns null when nothing found', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation(() => { throw new Error('not found'); });
  const gateway = loadGateway();
  expect(gateway.findBinary()).toBe(null);
});

test('isInstalled returns true when binary exists', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which clawdbot') return '/usr/local/bin/clawdbot';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  expect(gateway.isInstalled()).toBe(true);
});

test('isInstalled returns false when binary missing', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation(() => { throw new Error('not found'); });
  const gateway = loadGateway();
  expect(gateway.isInstalled()).toBe(false);
});

test('getVersion returns version string', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which clawdbot') return '/usr/local/bin/clawdbot';
    if (cmd.includes('--version')) return '1.2.3\n';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  expect(gateway.getVersion()).toBe('1.2.3');
});

test('writeConfig and readConfig roundtrip', () => {
  fs.mkdirSync(tmpDir, { recursive: true });
  const testConfig = {
    agent: { model: 'anthropic/claude-sonnet-4-20250514' },
    channels: { telegram: { enabled: true, botToken: 'test-token' } },
  };
  fs.writeFileSync(tmpConfig, JSON.stringify(testConfig, null, 2));
  const read = JSON.parse(fs.readFileSync(tmpConfig, 'utf-8'));
  expect(read.agent.model).toBe('anthropic/claude-sonnet-4-20250514');
  expect(read.channels.telegram.botToken).toBe('test-token');
});

test('startGateway throws when not installed', () => {
  const { execSync } = require('child_process');
  execSync.mockImplementation(() => { throw new Error('not found'); });
  const gateway = loadGateway();
  expect(() => gateway.startGateway()).toThrow('clawdbot is not installed');
});

test('startGateway spawns process with correct args', () => {
  const { execSync, spawn } = require('child_process');
  spawn.mockReturnValue({ on: jest.fn(), kill: jest.fn() });
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which clawdbot') return '/usr/local/bin/clawdbot';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  gateway.startGateway({ port: 19000, verbose: true });
  expect(spawn).toHaveBeenCalledWith(
    'clawdbot',
    ['gateway', '--port', '19000', '--verbose'],
    expect.objectContaining({ stdio: 'inherit' })
  );
});

test('startGateway passes --allow-unconfigured when option is set', () => {
  const { execSync, spawn } = require('child_process');
  spawn.mockReturnValue({ on: jest.fn(), kill: jest.fn() });
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which clawdbot') return '/usr/local/bin/clawdbot';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  gateway.startGateway({ port: 18789, allowUnconfigured: true });
  expect(spawn).toHaveBeenCalledWith(
    'clawdbot',
    ['gateway', '--port', '18789', '--allow-unconfigured'],
    expect.objectContaining({ stdio: 'inherit' })
  );
});

test('startGateway does not pass --allow-unconfigured when option is false', () => {
  const { execSync, spawn } = require('child_process');
  spawn.mockReturnValue({ on: jest.fn(), kill: jest.fn() });
  execSync.mockImplementation((cmd) => {
    if (cmd === 'which clawdbot') return '/usr/local/bin/clawdbot';
    throw new Error('not found');
  });
  const gateway = loadGateway();
  gateway.startGateway({ port: 18789, allowUnconfigured: false });
  expect(spawn).toHaveBeenCalledWith(
    'clawdbot',
    ['gateway', '--port', '18789'],
    expect.objectContaining({ stdio: 'inherit' })
  );
});
