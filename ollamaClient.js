const axios = require('axios');

// Default model is the deepseek tool-calling model unless overridden
const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL || 'MFDoom/deepseek-r1-tool-calling:8b';
const BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';

const systemPrompt = `You are an advanced, highly ethical, and meticulously accurate AI assistant. Your primary directive is to provide factual, verifiable, and precise information.

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
* Always aim to be helpful and informative within the bounds of factual accuracy.`;


async function readStream(res) {
  let buffer = '';
  const messages = [];
  for await (const chunk of res.data) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      messages.push(JSON.parse(line));
    }
  }
  return messages;
}

async function* sendMessageStream(message) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];
  const res = await axios.post(
    `${BASE}/api/chat`,
    { model: DEFAULT_MODEL, messages, stream: true },
    { responseType: 'stream' }
  );
  let buffer = '';
  for await (const chunk of res.data) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const data = JSON.parse(trimmed);
      const delta = data.message || data;
      if (delta.content) yield delta.content;
    }
  }
  const trimmed = buffer.trim();
  if (trimmed) {
    const data = JSON.parse(trimmed);
    const delta = data.message || data;
    if (delta.content) yield delta.content;
  }
}

async function sendMessage(message) {
  let out = '';
  for await (const part of sendMessageStream(message)) out += part;
  return out;
}

function getEnv() {
  return 'ollama';
}

async function listModels() {
  return [DEFAULT_MODEL];
}

async function generateCompletion(prompt) {
  const res = await axios.post(
    `${BASE}/api/generate`,
    { model: DEFAULT_MODEL, prompt, stream: true },
    { responseType: 'stream' }
  );
  const parts = await readStream(res);
  return parts.map(p => p.response || '').join('');
}

async function showModel(model) {
  const res = await axios.post(`${BASE}/api/show`, { model: model || DEFAULT_MODEL });
  return res.data;
}

module.exports = {
  sendMessage,
  sendMessageStream,
  listModels,
  generateCompletion,
  showModel,
  getEnv
};
