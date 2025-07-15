const readline = require('readline');
const { spawn } = require('child_process');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

(async () => {
  const answer = await ask('Choose environment (1) OpenAI (2) Ollama (Local): ');
  let env = 'openai';
  if (/^2|ollama/i.test(answer)) env = 'ollama';

  let model = process.env.OLLAMA_MODEL;
  if (env === 'ollama') {
    await ask('Select model (1) DeepSeek R1:7b: ');
    model = 'deepseek-r1:7b';
  }

  const child = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: { ...process.env, LLM_ENV: env, OLLAMA_MODEL: model }
  });
  child.on('close', code => process.exit(code));
})();
