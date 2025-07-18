const { spawn } = require('child_process');

// Simply start the server with whatever environment variables were provided.
// This removes the previous interactive prompt so the caller can control
// configuration via environment variables such as LLM_ENV and OLLAMA_MODEL.

const child = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', code => process.exit(code));
