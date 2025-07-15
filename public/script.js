document.addEventListener('DOMContentLoaded', () => {
  const messages = document.getElementById('messages');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const audioBtn = document.getElementById('audio');
  const liveBtn = document.getElementById('live');
  let liveSource = null;

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

  async function sendAudio() {
    if (!navigator.mediaDevices) return alert('No audio support');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        const res = await fetch('/api/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64 })
        });
        const data = await res.json();
        addMessage('assistant', data.reply || data.error);
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();
    setTimeout(() => recorder.stop(), 3000);
  }

  function toggleLive() {
    if (liveSource) {
      liveSource.close();
      liveSource = null;
      liveBtn.textContent = 'Start Live';
      return;
    }
    liveSource = new EventSource('/api/live');
    liveSource.onmessage = e => {
      const data = JSON.parse(e.data);
      if (data.reply) addMessage('assistant', data.reply);
    };
    liveBtn.textContent = 'Stop Live';
  }

  sendBtn.addEventListener('click', sendText);
  audioBtn.addEventListener('click', sendAudio);
  liveBtn.addEventListener('click', toggleLive);
});
