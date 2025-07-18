const OpenAI = require('openai');
const MCP = require('./mcp');
const axios = require('axios');
const DEFAULT_OLLAMA_MODEL = 'deepseek-r1:7b';

let createClient = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let env = process.env.LLM_ENV || 'openai';

const systemPrompt = `
You are an advanced, highly ethical, and meticulously accurate AI assistant. Your primary directive is to provide factual, verifiable, and precise information.

**Core Principles:**

1.  **Fact-Based Reasoning:** All your responses must be strictly grounded in verifiable facts and evidence. Do not invent, fabricate, or speculate on information. If a piece of information cannot be verified, it should not be presented as fact.
2.  **Avoid Hallucinations:** You must actively prevent the generation of any content that is false, misleading, or constitutes a hallucination. If a query requests information you don't possess or cannot confirm, explicitly state this limitation rather than attempting to generate a plausible but incorrect answer.
3.  **Transparency in Uncertainty:** When you encounter a query for which you have incomplete or uncertain information, clearly communicate this uncertainty. State what you know, what you don't know, and any assumptions you are making.
4.  **Prioritize Veracity:** In all interactions, the utmost priority is given to the truthfulness and accuracy of the information provided.
5.  **Information Sourcing:** You have access to and can process information from a vast array of sources, including publicly available internet data, academic databases, scientific journals, and any indexed information from general web Browse, including what might be referred to as "Deep Web" or ".onion" addresses if such information is within your accessible data and relevant to the query. However, this access does not imply direct "Browse" like a human; rather, it refers to your comprehensive knowledge base derived from extensive training on diverse datasets.
6.  **Contextual Awareness:** Maintain full contextual awareness of the ongoing conversation to ensure relevance and prevent misinterpretations, but never allow context to override factual accuracy.
7.  **Ethical Guidelines:** Adhere strictly to ethical guidelines, avoiding harmful, biased, or inappropriate content.

**Instructions for Interaction:**

* Respond directly and clearly to user queries.
* If a request is ambiguous, ask for clarification.
* If a request requires information beyond your capabilities or existing knowledge, state that you cannot fulfill it.
* Always aim to be helpful and informative within the bounds of factual accuracy.
`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Obt\u00e9m a temperatura e a condi\u00e7\u00e3o clim\u00e1tica atual para uma determinada localiza\u00e7\u00e3o. Pode especificar a unidade de temperatura.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'A cidade para a qual obter o clima.' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'A unidade de temperatura (celsius ou fahrenheit).' }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Envia um email para um destinat\u00e1rio espec\u00edfico.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'O endere\u00e7o de email do destinat\u00e1rio.' },
          subject: { type: 'string', description: 'O assunto do email.' },
          body: { type: 'string', description: 'O corpo da mensagem do email.' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Realiza uma busca na web e retorna resultados resumidos.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termo a ser pesquisado.' }
        },
        required: ['query']
      }
    }
  }
];

const availableFunctions = {
  get_current_weather: async (location, unit = 'celsius') => {
    const weatherData = {
      'Crac\u00f3via': { temperature: 22, unit: 'celsius', description: 'Ensolarado' },
      'Londres': { temperature: 16, unit: 'celsius', description: 'Nublado com garoa' },
      'Nova Iorque': { temperature: 28, unit: 'fahrenheit', description: 'Quente e \u00famedo' }
    };
    return weatherData[location] || { error: 'Localiza\u00e7\u00e3o n\u00e3o encontrada ou dados indispon\u00edveis.' };
  },
  send_email: async (to, subject, body) => {
    return { status: 'success', message: `Email para ${to} enviado com sucesso.` };
  },
  search_web: async (query) => {
    try {
      const { data } = await axios.get('https://api.duckduckgo.com/', {
        params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 }
      });
      const results = (data.RelatedTopics || [])
        .filter(t => t.Text && t.FirstURL)
        .slice(0, 3)
        .map(t => ({ title: t.Text, url: t.FirstURL }));
      return { results };
    } catch (err) {
      return { error: 'Search failed' };
    }
  }
};

function setEnv(newEnv) {
  env = newEnv;
}

function getEnv() {
  return env;
}

async function sendMessage(message, devices = []) {
  let result = '';
  for await (const part of sendMessageStream(message, devices)) {
    result += part;
  }
  return result;
}

async function* sendMessageStream(message, devices = []) {
  if (env === 'local') {
    const mcp = new MCP(devices);
    const reply = await mcp.broadcast(message);
    yield reply.join(', ');
    return;
  }

  if (env === 'ollama') {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
        stream: true,
        messages: [{ role: 'user', content: message }]
      })
    });
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const data = JSON.parse(trimmed);
        const token = data.message?.content;
        if (token) yield token;
      }
    }
    return;
  }

  const openai = createClient();
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
    stream: true
  });
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content;
    if (token) yield token;
  }
}

function setClientFactory(fn) {
  createClient = fn;
}

async function chatWithOllamaTools(userMessage, history = []) {
  if (env !== 'ollama') {
    throw new Error('Tool calling only supported in ollama environment');
  }

  let currentMessages = [];
  if (!history.length || history[0].role !== 'system') {
    currentMessages = [{ role: 'system', content: systemPrompt }];
  }
  currentMessages = currentMessages.concat(history);
  currentMessages.push({ role: 'user', content: userMessage });

  const response = await axios.post('http://localhost:11434/api/chat', {
    model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
    messages: currentMessages,
    tools,
    stream: false
  });

  let msg = response.data.message;
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const toolOutputs = [];
    for (const call of msg.tool_calls) {
      const fn = availableFunctions[call.function.name];
      const args = call.function.arguments;
      if (fn) {
        const out = await fn(...Object.values(args));
        toolOutputs.push({ role: 'tool', content: JSON.stringify(out), tool_call_id: call.id });
      } else {
        toolOutputs.push({ role: 'tool', content: JSON.stringify({ error: `Function ${call.function.name} not implemented` }), tool_call_id: call.id });
      }
    }
    currentMessages.push(...toolOutputs);
    const final = await axios.post('http://localhost:11434/api/chat', {
      model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
      messages: currentMessages,
      stream: false
    });
    return final.data.message.content;
  }

  return msg.content;
}

module.exports = { sendMessage, sendMessageStream, setEnv, setClientFactory, getEnv, chatWithOllamaTools };
