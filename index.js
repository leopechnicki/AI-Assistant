#!/usr/bin/env node
// Main entry point - starts the clawdbot gateway
const path = require('path');
const fs = require('fs');

// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const {
  isInstalled,
  getVersion,
  configExists,
  readConfig,
  startGateway,
} = require('./lib/gateway');

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   AI Assistant (powered by clawdbot)         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Pre-flight checks
  if (!isInstalled()) {
    console.error('ERROR: clawdbot is not installed.');
    console.error('');
    console.error('Run the setup first:');
    console.error('  npm run setup');
    console.error('');
    console.error('Or install manually:');
    console.error('  npm install -g clawdbot@latest');
    process.exit(1);
  }

  console.log(`clawdbot version: ${getVersion()}`);

  if (!configExists()) {
    console.error('');
    console.error('WARNING: No configuration found.');
    console.error('Run the setup to configure your assistant:');
    console.error('  npm run setup');
    console.error('');
    console.error('Starting with default configuration...');
    console.log('');
  } else {
    const config = readConfig();
    const model = config.agent && config.agent.model;
    const tg = config.channels && config.channels.telegram;
    console.log(`Model: ${model || 'default'}`);
    console.log(`Telegram: ${tg && tg.enabled ? 'enabled' : 'disabled'}`);
    console.log('');
  }

  // Determine port
  const config = readConfig() || {};
  const port = (config.gateway && config.gateway.port) || process.env.CLAWDBOT_GATEWAY_PORT || 18789;

  console.log(`Starting gateway on port ${port}...`);
  console.log(`Dashboard: http://localhost:${port}/`);
  console.log('');
  console.log('Press Ctrl+C to stop.');
  console.log('');

  // Start the gateway
  const child = startGateway({
    port,
    verbose: process.argv.includes('--verbose'),
  });

  // Forward signals for graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nStopping gateway...');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\nStopping gateway...');
    child.kill('SIGTERM');
  });
}

main();
