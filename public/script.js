document.addEventListener('DOMContentLoaded', () => {
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

  async function shareScreen() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenVideo.srcObject = stream;
      screenVideo.style.display = 'block';

      // Capture one frame and send to the server for analysis
      await new Promise(r => setTimeout(r, 500));
      const canvas = document.createElement('canvas');
      canvas.width = screenVideo.videoWidth;
      canvas.height = screenVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      const res = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      const data = await res.json();
      addMessage('assistant', data.reply || data.error);
    } catch (err) {
      alert('Screen share failed: ' + err.message);
    }
  }

  sendBtn.addEventListener('click', sendText);
  shareBtn.addEventListener('click', shareScreen);
});
