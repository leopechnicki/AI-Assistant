document.addEventListener('DOMContentLoaded', () => {
  const messages = document.getElementById('messages');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send');

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `<span class="${role}">${role}:</span> ${text}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendText() {
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    addMessage('assistant', data.reply || data.error);
  }

  sendBtn.addEventListener('click', sendText);
});
