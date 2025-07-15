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
  const inputRef = React.useRef(null);
  const recorderRef = React.useRef(null);
  const chunksRef = React.useRef([]);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  const sendText = async () => {
    const input = inputRef.current;
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
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendText();
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = e => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 })
      });
      const data = await res.json();
      addMessage('assistant', data.reply || data.error);
      stream.getTracks().forEach(t => t.stop());
    };
    recorder.start();
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
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
      React.createElement('input', { id: 'input', ref: inputRef, placeholder: 'Type a message', onKeyDown }),
      React.createElement('button', { id: 'send', onClick: sendText }, 'Send'),
      React.createElement('button', { id: 'record', onMouseDown: startRecording, onMouseUp: stopRecording, onMouseLeave: stopRecording }, 'Record')
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
