let React, createRoot;
if (typeof require !== 'undefined') {
  React = require('react');
  ({ createRoot } = require('react-dom/client'));
} else {
  React = window.React;
  createRoot = window.ReactDOM.createRoot;
}

function cn() {
  return Array.from(arguments).filter(Boolean).join(' ');
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

function formatText(text, showThink) {
  const parts = text.split(/(<think>|<\/think>)/);
  let thinking = false;
  return parts.map((p, i) => {
    if (p === '<think>') { thinking = true; return null; }
    if (p === '</think>') { thinking = false; return null; }
    if (thinking && showThink) {
      return React.createElement('span', { key: i, className: 'italic text-gray-500' }, p);
    }
    return p;
  });
}

function ChatApp() {
  const [messages, setMessages] = React.useState([]);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showThink, setShowThink] = React.useState(true);
  const inputRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const messagesRef = React.useRef(null);

  React.useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
            const msgs = [...prev];
            msgs[idx] = { role: 'assistant', text: current };
            return msgs;
          });
        }
      }
    }
  };

  const toggleMenu = () => setShowMenu(!showMenu);

  return React.createElement(
    'div',
    { id: 'chat', className: 'max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-4 relative' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-2' }, 'AI Assistant Chat'),
    React.createElement('div', { id: 'messages', ref: messagesRef, className: 'border h-72 overflow-y-auto p-2 space-y-2' },
      messages.map((m, i) =>
        React.createElement('div', { className: 'msg text-sm', key: i }, [
          React.createElement('span', { className: cn(m.role === 'user' ? 'font-bold' : 'text-gray-700') }, `${m.role}:`),
          ' ',
          ...formatText(m.text, showThink)
        ])
      )
    ),
    React.createElement('div', { className: 'controls flex gap-2 items-center' },
      React.createElement('input', { type: 'file', id: 'file', ref: fileRef, accept: '.txt,image/*', className: 'hidden' }),
      React.createElement('label', { htmlFor: 'file', className: 'p-2 border rounded-md bg-gray-200 hover:bg-gray-300 cursor-pointer', title: 'Upload file' },
        React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', className: 'w-5 h-5' },
          React.createElement('path', { d: 'M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z' }),
          React.createElement('path', { d: 'M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z' })
        )
      ),
      React.createElement('input', { id: 'input', ref: inputRef, placeholder: 'Type a message', onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); sendText(); } }, className: 'flex-1 border rounded-md p-2 text-sm' }),
      React.createElement(Button, { id: 'send', onClick: sendText, className: 'bg-green-600 hover:bg-green-600/90' }, 'Send'),
      showMenu && React.createElement('div', { key: 'menu', id: 'settings-menu', className: 'absolute right-2 top-10 bg-white border rounded shadow p-2 space-y-1' }, [
        React.createElement('label', { key: 'think', className: 'flex gap-2 items-center cursor-pointer px-2 py-1 hover:bg-gray-100' }, [
          React.createElement('input', { type: 'checkbox', checked: showThink, onChange: e => setShowThink(e.target.checked) }),
          'Show thinking'
        ]),
        React.createElement('button', { key: 'update', onClick: () => fetch('/api/update', { method: 'POST' }).then(r => r.json()).then(d => alert(d.reply || d.error)), className: 'block w-full text-left px-2 py-1 hover:bg-gray-100' }, 'Update'),
        React.createElement('button', { key: 'shutdown', onClick: () => { if (confirm('Are you sure?')) fetch('/api/shutdown', { method: 'POST' }); }, className: 'block w-full text-left px-2 py-1 hover:bg-gray-100' }, 'Shutdown')
      ]),
      React.createElement('button', { onClick: toggleMenu, className: 'p-2 ml-auto absolute right-2 top-2', title: 'Settings', id: 'settings-btn' },
        React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', className: 'w-5 h-5' },
          React.createElement('path', { d: 'M10 2a2 2 0 012 2v1.09a6.967 6.967 0 012.53 1.07l.77-.77a2 2 0 112.83 2.83l-.77.77A6.967 6.967 0 0116.91 10H18a2 2 0 110 4h-1.09a6.967 6.967 0 01-1.07 2.53l.77.77a2 2 0 11-2.83 2.83l-.77-.77A6.967 6.967 0 0112 16.91V18a2 2 0 11-4 0v-1.09a6.967 6.967 0 01-2.53-1.07l-.77.77a2 2 0 11-2.83-2.83l.77-.77A6.967 6.967 0 013.09 12H2a2 2 0 110-4h1.09a6.967 6.967 0 011.07-2.53l-.77-.77a2 2 0 112.83-2.83l.77.77A6.967 6.967 0 018 3.09V2a2 2 0 012-2z' })
        )
      )
    )
  );
}

function setupChat(doc = document) {
  const container = doc.getElementById('app');
  const root = createRoot(container);
  root.render(React.createElement(ChatApp));
  return { container, root };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => setupChat());
}

if (typeof module !== 'undefined') {
  module.exports = { setupChat, ChatApp };
}
