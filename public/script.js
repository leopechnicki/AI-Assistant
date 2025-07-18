let React, createRoot;
if (typeof require !== 'undefined') {
  React = require('react');
  ({ createRoot } = require('react-dom/client'));
} else {
  React = window.React;
  createRoot = window.ReactDOM.createRoot;
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
    if (!confirm('Are you sure…?')) return;
    await fetch('/api/shutdown', { method: 'POST' });
  };

  const updateAssistant = async () => {
    const res = await fetch('/api/update', { method: 'POST' });
    const data = await res.json();
    alert(data.reply || data.error);
  };

  const resetConversation = () => {
    setMessages([]);
  };

  const clearMessages = () => {
    if (!confirm('Delete all messages?')) return;
    setMessages([]);
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendText();
    }
  };

  return React.createElement('div', { id: 'chat', className: 'max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-4' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-2' }, 'AI Assistant Chat'),
    React.createElement('ul', { className: 'text-xs list-disc pl-5 space-y-1' }, [
      React.createElement('li', { key: 'w' }, 'Pergunte "Qual o clima em <cidade>?" para acionar a ferramenta de clima.'),
      React.createElement('li', { key: 'e' }, 'Diga "Envie um email..." para usar o envio de emails.'),
      React.createElement('li', { key: 'u' }, 'Use o botão Update para atualizar o assistente.')
    ]),
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
    React.createElement('div', { className: 'controls flex gap-2 items-center' },
      React.createElement('input', { type: 'file', id: 'file', ref: fileRef, accept: '.txt,image/*', className: 'hidden' }),
      React.createElement(
        'label',
        {
          htmlFor: 'file',
          className:
            'p-2 border rounded-md bg-gray-200 hover:bg-gray-300 cursor-pointer',
          title: 'Upload file'
        },
        React.createElement(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: '0 0 20 20',
            fill: 'currentColor',
            className: 'w-5 h-5'
          },
          [
            React.createElement('path', {
              key: 'p1',
              d: 'M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z'
            }),
            React.createElement('path', {
              key: 'p2',
              d: 'M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z'
            })
          ]
        )
      ),
      React.createElement('input', { id: 'input', ref: inputRef, placeholder: 'Type a message', onKeyDown, className: 'flex-1 border rounded-md p-2 text-sm' }),
      React.createElement(Button, { id: 'send', onClick: sendText, className: 'bg-green-600 hover:bg-green-600/90' }, 'Send'),
      React.createElement(Button, { id: 'reset', onClick: resetConversation, className: 'bg-yellow-600 hover:bg-yellow-600/90' }, 'New'),
      React.createElement(Button, { id: 'clear', onClick: clearMessages, className: 'bg-gray-600 hover:bg-gray-600/90' }, 'Clear'),
      React.createElement(Button, { id: 'update', onClick: updateAssistant, className: 'bg-blue-800 hover:bg-blue-800/90' }, 'Update'),
      React.createElement(
        Button,
        { id: 'shutdown', onClick: shutdown, className: 'bg-red-600 hover:bg-red-600/90' },
        '\u23FB'
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
