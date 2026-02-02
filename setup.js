#!/usr/bin/env node
// Interactive setup for clawdbot AI assistant with Telegram
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const {
  isInstalled,
  findBinary,
  getVersion,
  configExists,
  readConfig,
  writeConfig,
  CONFIG_DIR,
  CONFIG_FILE,
} = require('./lib/gateway');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, defaultValue) {
  return new Promise((resolve) => {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function askSecret(question) {
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   AI Assistant - clawdbot Setup              ║');
  console.log('║   Personal AI on Telegram + Local access     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Check Node version
  const nodeVersion = parseInt(process.version.slice(1), 10);
  console.log(`[1/5] Node.js version: ${process.version}`);
  if (nodeVersion < 22) {
    console.error('');
    console.error('ERROR: clawdbot requires Node.js >= 22');
    console.error('Your version: ' + process.version);
    console.error('');
    console.error('Install Node 22+:');
    console.error('  curl -fsSL https://fnm.vercel.app/install | bash');
    console.error('  fnm install 22');
    console.error('  fnm use 22');
    console.error('');
    console.error('Or use nvm:');
    console.error('  nvm install 22');
    console.error('  nvm use 22');
    rl.close();
    process.exit(1);
  }
  console.log('       OK\n');

  // Step 2: Install clawdbot globally if not present
  console.log('[2/5] Checking clawdbot installation...');
  if (isInstalled()) {
    console.log(`       Already installed: ${getVersion()}`);
  } else {
    console.log('       clawdbot not found. Installing globally...');
    try {
      execSync('npm install -g clawdbot@latest', { stdio: 'inherit' });
      console.log('       Installed successfully!');
    } catch (err) {
      console.error('');
      console.error('ERROR: Failed to install clawdbot.');
      console.error('Try installing manually:');
      console.error('  npm install -g clawdbot@latest');
      console.error('');
      console.error('If you get permission errors, try:');
      console.error('  sudo npm install -g clawdbot@latest');
      rl.close();
      process.exit(1);
    }
  }
  console.log('');

  // Step 3: Collect configuration
  console.log('[3/5] Configuration');
  console.log('     We need a few things to set up your assistant.\n');

  // Load existing config if any
  const existing = readConfig() || {};

  // AI Provider / API Key
  console.log('--- AI Model ---');
  console.log('clawdbot supports Anthropic Claude (recommended) or OpenAI.');
  console.log('You need an API key or a Claude Pro/Max subscription.\n');

  const provider = await ask('Provider (anthropic/openai)', 'anthropic');

  let model;
  let apiKeyEnvHint;
  if (provider === 'openai') {
    model = await ask('Model', 'openai/gpt-4o');
    apiKeyEnvHint = 'OPENAI_API_KEY';
    console.log('\nSet your OpenAI API key:');
    console.log('  export OPENAI_API_KEY="sk-..."');
  } else {
    model = await ask('Model', 'anthropic/claude-sonnet-4-20250514');
    apiKeyEnvHint = 'ANTHROPIC_API_KEY';
    console.log('\nSet your Anthropic API key:');
    console.log('  export ANTHROPIC_API_KEY="sk-ant-..."');
    console.log('\nOr use Claude Pro/Max OAuth (configured during onboarding).');
  }

  const apiKey = await askSecret(`\nPaste your API key now (or press Enter to set it later)`);
  console.log('');

  // Telegram Bot Setup
  console.log('--- Telegram Bot ---');
  console.log('1. Open Telegram and search for @BotFather');
  console.log('2. Send /newbot and follow the prompts');
  console.log('3. Copy the bot token\n');

  const telegramToken = await askSecret('Telegram bot token (from @BotFather)');
  if (!telegramToken) {
    console.log('WARNING: No Telegram token provided. You can add it later in the config.\n');
  }
  console.log('');

  // Gateway port
  const port = await ask('Gateway port', '18789');
  console.log('');

  // Step 4: Write configuration
  console.log('[4/5] Writing configuration...');

  const config = {
    agent: {
      model,
    },
    channels: {
      telegram: {
        enabled: !!telegramToken,
        ...(telegramToken ? { botToken: telegramToken } : {}),
        dmPolicy: 'pairing',
      },
    },
    gateway: {
      port: parseInt(port, 10),
    },
  };

  writeConfig(config);
  console.log(`       Config written to: ${CONFIG_FILE}`);

  // Write .env file for convenience
  const envLines = [];
  if (apiKey && provider !== 'openai') {
    envLines.push(`ANTHROPIC_API_KEY=${apiKey}`);
  } else if (apiKey && provider === 'openai') {
    envLines.push(`OPENAI_API_KEY=${apiKey}`);
  }
  envLines.push(`CLAWDBOT_GATEWAY_PORT=${port}`);

  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envLines.join('\n') + '\n');
  console.log(`       Environment written to: ${envPath}`);
  console.log('');

  // Step 5: Run onboarding (optional)
  console.log('[5/5] Finalize');
  const bin = findBinary();
  const runOnboard = await ask('Run clawdbot onboarding wizard? (y/n)', 'n');

  if (runOnboard.toLowerCase() === 'y') {
    console.log('\nStarting clawdbot onboarding wizard...\n');
    const parts = bin.split(' ');
    spawnSync(parts[0], [...parts.slice(1), 'onboard'], { stdio: 'inherit' });
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Setup complete!                            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('Next steps:');
  console.log('');
  if (!apiKey) {
    console.log(`  1. Set your API key:`);
    console.log(`     export ${apiKeyEnvHint}="your-key-here"`);
    console.log('');
  }
  console.log('  Start the assistant:');
  console.log('     npm start');
  console.log('');
  console.log('  Then message your bot on Telegram!');
  if (telegramToken) {
    console.log('  First message will require pairing approval in the terminal.');
  }
  console.log('');
  console.log('  Gateway dashboard will be at:');
  console.log(`     http://localhost:${port}/`);
  console.log('');

  rl.close();
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  rl.close();
  process.exit(1);
});
