const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const shareBtn = document.getElementById('share');
const screenVideo = document.getElementById('screen');

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<span class="${role}">${role}:</span> ${text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

sendBtn.onclick = async () => {
  const text = input.value;
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
};

shareBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenVideo.srcObject = stream;
    screenVideo.style.display = 'block';
  } catch (err) {
    alert('Screen share failed: ' + err.message);
  }
};
