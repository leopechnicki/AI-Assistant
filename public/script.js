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
  const [tabs, setTabs] = React.useState([
    { messages: [], env: 'openai', model: '' }
  ]);
  const [activeTab, setActiveTab] = React.useState(0);
  const inputRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const envRef = React.useRef(null);
  const modelRef = React.useRef(null);
  const messagesRef = React.useRef(null);

  const currentTab = tabs[activeTab];

  const addMessage = (role, text) => {
    setTabs(prev => {
      const copy = [...prev];
      const tab = { ...copy[activeTab] };
      tab.messages = [...tab.messages, { role, text }];
      copy[activeTab] = tab;
      return copy;
    });
  };

  React.useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [currentTab.messages]);

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
    const env = envRef.current.value;
    const model = modelRef.current.value;
    setTabs(prev => {
      const copy = [...prev];
      copy[activeTab] = { ...copy[activeTab], env, model };
      return copy;
    });
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, env, model })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let current = '';
    addMessage('assistant', '');
    const idx = currentTab.messages.length + 1;
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
          setTabs(prev => {
            const copy = [...prev];
            const tab = { ...copy[activeTab] };
            const msgs = [...tab.messages];
            msgs[idx] = { role: 'assistant', text: current };
            tab.messages = msgs;
            copy[activeTab] = tab;
            return copy;
          });
        }
      }
    }
  };

  const switchTab = idx => {
    setTabs(prev => {
      const copy = [...prev];
      copy[activeTab] = { ...copy[activeTab], env: envRef.current.value, model: modelRef.current.value };
      return copy;
    });
    setActiveTab(idx);
  };

  const addTab = () => {
    setTabs(prev => [...prev, { messages: [], env: 'openai', model: '' }]);
    setActiveTab(tabs.length);
  };

  const closeTab = idx => {
    if (tabs.length === 1) return;
    setTabs(prev => prev.filter((_, i) => i !== idx));
    setActiveTab(prev => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return idx > 0 ? idx - 1 : 0;
      return prev;
    });
  };

  React.useEffect(() => {
    if (!envRef.current || !modelRef.current) return;
    envRef.current.value = tabs[activeTab].env;
    modelRef.current.value = tabs[activeTab].model;
  }, [activeTab, tabs]);

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
    setTabs(prev => {
      const copy = [...prev];
      copy[activeTab] = { ...copy[activeTab], messages: [] };
      return copy;
    });
  };

  const clearMessages = () => {
    if (!confirm('Delete all messages?')) return;
    setTabs(prev => {
      const copy = [...prev];
      copy[activeTab] = { ...copy[activeTab], messages: [] };
      return copy;
    });
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendText();
    }
  };

  return React.createElement('div', { id: 'chat', className: 'max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-4' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-2' }, 'AI Assistant Chat'),
    React.createElement('div', { id: 'tabs', className: 'flex gap-2 mb-2' },
      [
        ...tabs.map((t, i) =>
          React.createElement('div', {
            key: i,
            onClick: () => switchTab(i),
            className: cn('px-2 py-1 rounded cursor-pointer', i === activeTab ? 'bg-blue-600 text-white' : 'bg-gray-200')
          }, [
            `Tab ${i + 1} (${t.model || 'default'})`,
            tabs.length > 1 ? React.createElement('button', {
              onClick: e => { e.stopPropagation(); closeTab(i); },
              className: 'ml-1 text-xs'
            }, 'x') : null
          ])
        ),
        React.createElement('button', { id: 'add-tab', key: 'add', onClick: addTab, className: 'px-2 py-1 bg-green-200 rounded' }, '+')
      ]
    ),
    React.createElement('ul', { className: 'text-xs list-disc pl-5 space-y-1' }, [
      React.createElement('li', { key: 'w' }, 'Pergunte "Qual o clima em <cidade>?" para acionar a ferramenta de clima.'),
      React.createElement('li', { key: 'e' }, 'Diga "Envie um email..." para usar o envio de emails.'),
      React.createElement('li', { key: 'u' }, 'Use o botão Update para atualizar o assistente.')
    ]),
    React.createElement('div', { id: 'messages', ref: messagesRef, className: 'border h-72 overflow-y-auto p-2 space-y-2' },
      currentTab.messages.map((m, i) =>
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
      React.createElement('select', { id: 'env', ref: envRef, className: 'border rounded-md p-2 text-sm' }, [
        React.createElement('option', { key: 'openai', value: 'openai' }, 'openai'),
        React.createElement('option', { key: 'ollama', value: 'ollama' }, 'ollama'),
        React.createElement('option', { key: 'local', value: 'local' }, 'local')
      ]),
      React.createElement('input', { id: 'model', ref: modelRef, placeholder: 'model', className: 'border rounded-md p-2 text-sm w-24' }),
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
