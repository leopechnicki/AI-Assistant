const readline = require('readline');
const { spawn } = require('child_process');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

(async () => {
  const answer = await ask('Choose environment (1) Local (2) OpenAI: ');
  const env = /^1|local/i.test(answer) ? 'local' : 'openai';

  const child = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: { ...process.env, LLM_ENV: env }
  });
  child.on('close', code => process.exit(code));
})();
