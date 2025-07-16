let React, ReactDOM;
if (typeof require !== 'undefined') {
  React = require('react');
  ReactDOM = require('react-dom');
} else {
  React = window.React;
  ReactDOM = window.ReactDOM;
}

function ChatApp() {
  const [messages, setMessages] = React.useState([]);
  const [useStream, setUseStream] = React.useState(false);
  const inputRef = React.useRef(null);
  const fileRef = React.useRef(null);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  const sendText = async () => {
    const input = inputRef.current;
    const fileInput = fileRef.current;
    const text = input.value.trim();
    const file = fileInput.files[0];
    if (!text && !file) return;
    if (file) {
      const reader = new FileReader();
      const data = await new Promise(r => { reader.onload = () => r(reader.result); });
      reader.readAsDataURL(file);
      addMessage('user', file.name);
      fileInput.value = '';
      const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, content: data })
      });
      const dataRes = await res.json();
      addMessage('assistant', dataRes.reply || dataRes.error);
      return;
    }
    addMessage('user', text);
    input.value = '';
    if (useStream) {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let current = '';
      addMessage('assistant', '');
      const idx = messages.length + 1;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            current += data;
            setMessages(prev => {
              const copy = [...prev];
              copy[idx] = { role: 'assistant', text: current };
              return copy;
            });
          }
        }
      }
    } else {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      addMessage('assistant', data.reply || data.error);
    }
  };

  const shutdown = async () => {
    await fetch('/api/shutdown', { method: 'POST' });
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendText();
    }
  };

  return React.createElement('div', { id: 'chat' },
    React.createElement('h1', null, 'AI Assistant Chat'),
    React.createElement('div', { id: 'messages' },
      messages.map((m, i) =>
        React.createElement('div', { className: 'msg', key: i },
          React.createElement('span', { className: m.role }, `${m.role}:`), ' ', m.text)
      )
    ),
    React.createElement('div', { className: 'controls' },
      React.createElement('input', { type: 'file', id: 'file', ref: fileRef, accept: '.txt,image/*' }),
      React.createElement('input', { id: 'input', ref: inputRef, placeholder: 'Type a message', onKeyDown }),
      React.createElement('label', null,
        React.createElement('input', {
          type: 'checkbox',
          checked: useStream,
          onChange: e => setUseStream(e.target.checked)
        }),
        ' Stream'
      ),
      React.createElement('button', { id: 'send', onClick: sendText }, 'Send'),
      React.createElement(
        'button',
        { id: 'shutdown', onClick: shutdown },
        'Shutdown'
      )
    )
  );
}

function setupChat(doc = document) {
  const container = doc.getElementById('app');
  ReactDOM.render(React.createElement(ChatApp), container);
  return { container };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => setupChat());
}

if (typeof module !== 'undefined') {
  module.exports = { setupChat, ChatApp };
}
