// Manages the clawdbot gateway process
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR = path.join(require('os').homedir(), '.openclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'openclaw.json');

// Try to find the clawdbot/openclaw binary
function findBinary() {
  const names = ['clawdbot', 'openclaw'];
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  for (const name of names) {
    try {
      execSync(`${whichCmd} ${name}`, { stdio: 'ignore' });
      return name;
    } catch {}
  }
  // Try npx as fallback
  try {
    execSync('npx --yes clawdbot --version', { stdio: 'ignore', timeout: 30000 });
    return 'npx --yes clawdbot';
  } catch {}
  return null;
}

function isInstalled() {
  return findBinary() !== null;
}

function getVersion() {
  const bin = findBinary();
  if (!bin) return null;
  try {
    return execSync(`${bin} --version`, { encoding: 'utf-8' }).trim();
  } catch {
    return 'installed (version unknown)';
  }
}

function configExists() {
  return fs.existsSync(CONFIG_FILE);
}

function readConfig() {
  if (!configExists()) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function startGateway(opts = {}) {
  const bin = findBinary();
  if (!bin) {
    throw new Error('clawdbot is not installed. Run: npm run setup');
  }

  const args = ['gateway'];
  if (opts.port) args.push('--port', String(opts.port));
  if (opts.verbose) args.push('--verbose');

  const parts = bin.split(' ');
  const cmd = parts[0];
  const cmdArgs = [...parts.slice(1), ...args];

  console.log(`Starting: ${bin} ${args.join(' ')}`);

  const child = spawn(cmd, cmdArgs, {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  });

  child.on('error', (err) => {
    console.error('Failed to start clawdbot gateway:', err.message);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`\nGateway terminated by signal ${signal}`);
    } else if (code !== 0) {
      console.error(`Gateway exited with code ${code}`);
    }
  });

  return child;
}

function status() {
  const bin = findBinary();
  console.log('=== clawdbot Status ===');
  console.log(`Installed: ${bin ? 'yes' : 'no'}`);
  if (bin) {
    console.log(`Binary: ${bin}`);
    console.log(`Version: ${getVersion()}`);
  }
  console.log(`Config: ${configExists() ? CONFIG_FILE : 'not found'}`);
  const config = readConfig();
  if (config) {
    const tg = config.channels && config.channels.telegram;
    console.log(`Telegram: ${tg && tg.enabled ? 'enabled' : 'disabled'}`);
    const model = config.agent && config.agent.model;
    if (model) console.log(`Model: ${model}`);
  }
}

module.exports = {
  findBinary,
  isInstalled,
  getVersion,
  configExists,
  readConfig,
  writeConfig,
  startGateway,
  status,
  CONFIG_DIR,
  CONFIG_FILE,
};
