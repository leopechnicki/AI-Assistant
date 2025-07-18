let React, ReactDOM;
if (typeof require !== 'undefined') {
  React = require('react');
  ReactDOM = require('react-dom');
} else {
  React = window.React;
  ReactDOM = window.ReactDOM;
}

function cn() {
  return Array.from(arguments)
    .filter(Boolean)
    .join(' ');
}

const Button = React.forwardRef(function Button({ className, ...props }, ref) {
  return React.createElement(
    'button',
    {
      ref,
      className: cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none px-3 py-2 bg-blue-600 text-white hover:bg-blue-600/90',
        className
      ),
      ...props
    },
    props.children
  );
});

function formatText(text) {
  const parts = text.split(/(<think>|<\/think>)/);
  let thinking = false;
  return parts.map((p, i) => {
    if (p === '<think>') { thinking = true; return null; }
    if (p === '</think>') { thinking = false; return null; }
    if (thinking) {
      return React.createElement('span', { key: i, className: 'italic text-gray-500' }, p);
    }
    return p;
  });
}

function ChatApp() {
  const [messages, setMessages] = React.useState([]);
  const inputRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const messagesRef = React.useRef(null);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  React.useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
          current += data + ' ';
          setMessages(prev => {
            const copy = [...prev];
            copy[idx] = { role: 'assistant', text: current };
            return copy;
          });
        }
      }
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

  return React.createElement('div', { id: 'chat', className: 'max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-4' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-2' }, 'AI Assistant Chat'),
    React.createElement('div', { id: 'messages', ref: messagesRef, className: 'border h-72 overflow-y-auto p-2 space-y-2' },
      messages.map((m, i) =>
        React.createElement('div', { className: 'msg text-sm', key: i },
          [
            React.createElement('span', { className: cn(m.role === 'user' ? 'font-bold' : 'text-gray-700') }, `${m.role}:`),
            ' ',
            ...formatText(m.text)
          ]
        )
      )
    ),
    React.createElement('div', { className: 'controls flex gap-2' },
      React.createElement('input', { type: 'file', id: 'file', ref: fileRef, accept: '.txt,image/*', className: 'flex-1 border rounded-md p-2 text-sm' }),
      React.createElement('input', { id: 'input', ref: inputRef, placeholder: 'Type a message', onKeyDown, className: 'flex-1 border rounded-md p-2 text-sm' }),
      React.createElement(Button, { id: 'send', onClick: sendText, className: 'bg-green-600 hover:bg-green-600/90' }, 'Send'),
      React.createElement(
        Button,
        { id: 'shutdown', onClick: shutdown, className: 'bg-red-600 hover:bg-red-600/90' },
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
