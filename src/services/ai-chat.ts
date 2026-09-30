import type { AiConfig } from '@/contexts/AiConfigContext';
import type { ChatAttachment } from '@/services/attachments';
import { createSSEPump } from './sse';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number;
  attachments?: ChatAttachment[];
}

export interface ChatRequest {
  config: AiConfig;
  messages: ChatMessage[];
}

export interface StreamRequest extends ChatRequest {
  onChunk?: (partialText: string) => void;
  signal?: AbortSignal;
}

function normalizeBaseUrl(domain: string, path: string): string {
  let cleanedDomain = domain.trim();
  if (!cleanedDomain.startsWith('http://') && !cleanedDomain.startsWith('https://')) {
    cleanedDomain = `https://${cleanedDomain}`;
  }
  cleanedDomain = cleanedDomain.replace(/\/+$/, '');

  let cleanedPath = path.trim();
  if (cleanedPath && !cleanedPath.startsWith('/')) {
    cleanedPath = `/${cleanedPath}`;
  }

  if (cleanedDomain.endsWith(cleanedPath)) {
    return cleanedDomain;
  }

  return `${cleanedDomain}${cleanedPath}`;
}

function splitDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function buildTextWithAttachments(msg: ChatMessage): string {
  let text = msg.content || '';
  for (const att of msg.attachments ?? []) {
    if (att.kind === 'text' && att.textContent) {
      const truncated =
        att.textContent.length > 20000 ? att.textContent.slice(0, 20000) + '\n…[truncated]' : att.textContent;
      text += `\n\n[Attached document: ${att.name}]\n${truncated}`;
    } else if (att.kind === 'file') {
      text += `\n\n[Attached file: ${att.name} (${att.mimeType}) — binary content not inlined]`;
    }
  }
  return text;
}

function buildFullText(msg: ChatMessage): string {
  let fullText = msg.content || '';
  for (const att of msg.attachments ?? []) {
    if (att.kind === 'text' && att.textContent) {
      fullText += `\n\n[Attached document: ${att.name}]\n${att.textContent.slice(0, 20000)}`;
    } else if (att.kind === 'file') {
      fullText += `\n\n[Attached file: ${att.name} (${att.mimeType}) — binary content not inlined]`;
    }
  }
  return fullText;
}

// ---------- Shared request builders (used by both streaming and non-streaming) ----------

type OpenAIContent = string | Record<string, unknown>[];
interface OpenAIMessage {
  role: string;
  content: OpenAIContent;
}

function buildOpenAIMessages(config: AiConfig, messages: ChatMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  if (config.systemPrompt.trim()) {
    out.push({ role: 'system', content: config.systemPrompt.trim() });
  }
  for (const msg of messages) {
    const images = (msg.attachments ?? []).filter((a) => a.kind === 'image' && a.dataUrl);
    if (msg.role === 'user' && images.length > 0) {
      const textPart = buildTextWithAttachments(msg);
      out.push({
        role: msg.role,
        content: [
          ...(textPart ? [{ type: 'text', text: textPart }] : []),
          ...images.map((img) => ({
            type: 'image_url',
            image_url: { url: img.dataUrl },
          })),
        ],
      });
    } else {
      out.push({ role: msg.role, content: buildTextWithAttachments(msg) });
    }
  }
  return out;
}

function openAIHeaders(config: AiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey.trim()}`,
  };
  if (config.domain.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://expo.dev';
    headers['X-Title'] = 'Expo AI Chat App';
  }
  return headers;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Record<string, unknown>[];
}

function buildAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
  return messages
    .filter(
      (m): m is ChatMessage & { role: 'user' | 'assistant' } =>
        m.role === 'user' || m.role === 'assistant'
    )
    .map((msg) => {
      if (msg.role !== 'user' || !msg.attachments?.length) {
        return { role: msg.role, content: buildTextWithAttachments(msg) };
      }
      const blocks: Record<string, unknown>[] = [];
      const fullText = buildFullText(msg);
      if (fullText) blocks.push({ type: 'text', text: fullText });
      for (const att of msg.attachments) {
        if (att.kind === 'image' && att.dataUrl) {
          const parsed = splitDataUrl(att.dataUrl);
          if (parsed) {
            blocks.push({
              type: 'image',
              source: { type: 'base64', media_type: parsed.mimeType, data: parsed.base64 },
            });
          }
        }
      }
      return { role: 'user' as const, content: blocks };
    });
}

interface GooglePart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

function buildGoogleContents(messages: ChatMessage[]): { role: string; parts: GooglePart[] }[] {
  return messages.map((m) => {
    const parts: GooglePart[] = [];
    const fullText = buildFullText(m);
    if (fullText) parts.push({ text: fullText });
    for (const att of m.attachments ?? []) {
      if (att.kind === 'image' && att.dataUrl) {
        const parsed = splitDataUrl(att.dataUrl);
        if (parsed) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } });
        }
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
}

function googleBase(config: AiConfig, baseUrl: string): string {
  let cleanDomain = baseUrl.trim();
  if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
    cleanDomain = `https://${cleanDomain}`;
  }
  return cleanDomain.replace(/\/+$/, '');
}

// ---------- Non-streaming ----------

export async function sendMessage({ config, messages }: ChatRequest): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API Key is missing. Please set your API Key in Settings.');
  }
  if (!config.domain) {
    throw new Error('Domain endpoint is missing. Please specify a domain in Settings.');
  }

  const endpointUrl = normalizeBaseUrl(config.domain, config.customPath || '/v1/chat/completions');

  if (config.protocol === 'google') {
    return sendGoogleRequest({ config, messages, baseUrl: config.domain });
  }

  if (config.protocol === 'anthropic') {
    return sendAnthropicRequest({ config, messages, endpointUrl });
  }

  return sendOpenAICompatibleRequest({ config, messages, endpointUrl });
}

async function sendOpenAICompatibleRequest({
  config,
  messages,
  endpointUrl,
}: {
  config: AiConfig;
  messages: ChatMessage[];
  endpointUrl: string;
}) {
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: openAIHeaders(config),
    body: JSON.stringify({
      model: config.model.trim() || 'gpt-4o-mini',
      messages: buildOpenAIMessages(config, messages),
      temperature: config.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || choice?.text;

  if (!content) {
    throw new Error('Received an empty response from the AI model.');
  }

  return typeof content === 'string' ? content : JSON.stringify(content);
}

async function sendAnthropicRequest({
  config,
  messages,
  endpointUrl,
}: {
  config: AiConfig;
  messages: ChatMessage[];
  endpointUrl: string;
}) {
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: config.model.trim() || 'claude-3-5-haiku-20241022',
      system: config.systemPrompt.trim() || undefined,
      messages: buildAnthropicMessages(messages),
      max_tokens: 2048,
      temperature: config.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('Received an empty response from Anthropic API.');
  }

  return content;
}

async function sendGoogleRequest({
  config,
  messages,
  baseUrl,
}: {
  config: AiConfig;
  messages: ChatMessage[];
  baseUrl: string;
}) {
  const cleanDomain = googleBase(config, baseUrl);
  const modelName = config.model.trim() || 'gemini-1.5-flash';
  const url = `${cleanDomain}/v1beta/models/${modelName}:generateContent?key=${config.apiKey.trim()}`;

  const bodyPayload: Record<string, unknown> = {
    contents: buildGoogleContents(messages),
    generationConfig: {
      temperature: config.temperature ?? 0.7,
    },
  };

  if (config.systemPrompt.trim()) {
    bodyPayload.systemInstruction = {
      parts: [{ text: config.systemPrompt.trim() }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Received an empty response from Gemini API.');
  }

  return text;
}

async function parseErrorResponse(response: Response): Promise<string> {
  let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
  try {
    const errorJson = await response.json();
    errorMessage =
      errorJson.error?.message || errorJson.message || errorJson.error?.text || JSON.stringify(errorJson);
  } catch {
    try {
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    } catch {}
  }
  return errorMessage;
}

export async function testAiConnection(config: AiConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testMessages: ChatMessage[] = [
      { id: 'test-1', role: 'user', content: 'Say "Connection successful" in 3 words.' },
    ];
    const reply = await sendMessage({ config, messages: testMessages });
    return { success: true, message: `Connected! Response: "${reply.trim()}"` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

// ---------- Streaming (SSE via XMLHttpRequest; works on native + web) ----------

function parseErrorText(status: number, statusText: string, text: string): string {
  let message = `HTTP Error ${status}: ${statusText}`;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      message = parsed.error?.message || parsed.message || parsed.error?.text || JSON.stringify(parsed);
    } catch {
      message = text.slice(0, 500);
    }
  }
  return message;
}

function safeResponseText(xhr: XMLHttpRequest): string {
  try {
    return xhr.responseText ?? '';
  } catch {
    return '';
  }
}

function postSSE({
  url,
  headers,
  body,
  signal,
  timeoutMs = 120000,
  onData,
}: {
  url: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  onData: (data: string) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const pump = createSSEPump(onData);
    let seen = 0;
    let settled = false;

    const abortHandler = () => {
      try {
        xhr.abort();
      } catch {
        // noop
      }
    };
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        signal?.removeEventListener('abort', abortHandler);
        fn();
      }
    };

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    const readNew = () => {
      const full = safeResponseText(xhr);
      if (full.length > seen) {
        pump.push(full.slice(seen));
        seen = full.length;
      }
    };

    try {
      xhr.open('POST', url);
    } catch (e) {
      settle(() => reject(e instanceof Error ? e : new Error(String(e))));
      return;
    }
    for (const [key, value] of Object.entries(headers)) {
      try {
        xhr.setRequestHeader(key, value);
      } catch {
        // Forbidden header on this platform; skip.
      }
    }
    xhr.timeout = timeoutMs;
    xhr.onprogress = () => readNew();
    xhr.onload = () => {
      readNew();
      pump.flush();
      const status = xhr.status;
      if (status >= 200 && status < 300) {
        settle(() => resolve());
      } else {
        const text = safeResponseText(xhr);
        settle(() => reject(new Error(parseErrorText(status, xhr.statusText, text))));
      }
    };
    xhr.onerror = () => settle(() => reject(new Error('Network request failed.')));
    xhr.ontimeout = () => settle(() => reject(new Error('Request timed out.')));
    xhr.onabort = () => settle(() => reject(new DOMException('Aborted', 'AbortError')));
    try {
      xhr.send(body);
    } catch (e) {
      settle(() => reject(e instanceof Error ? e : new Error(String(e))));
    }
  });
}

function tryParseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function sendMessageStream({
  config,
  messages,
  onChunk,
  signal,
}: StreamRequest): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API Key is missing. Please set your API Key in Settings.');
  }
  if (!config.domain) {
    throw new Error('Domain endpoint is missing. Please specify a domain in Settings.');
  }

  const endpointUrl = normalizeBaseUrl(config.domain, config.customPath || '/v1/chat/completions');

  if (config.protocol === 'google') {
    return streamGoogleRequest({ config, messages, baseUrl: config.domain, onChunk, signal });
  }

  if (config.protocol === 'anthropic') {
    return streamAnthropicRequest({ config, messages, endpointUrl, onChunk, signal });
  }

  return streamOpenAICompatibleRequest({ config, messages, endpointUrl, onChunk, signal });
}

async function streamOpenAICompatibleRequest({
  config,
  messages,
  endpointUrl,
  onChunk,
  signal,
}: {
  config: AiConfig;
  messages: ChatMessage[];
  endpointUrl: string;
  onChunk?: (partialText: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  let acc = '';
  let streamError: string | null = null;

  await postSSE({
    url: endpointUrl,
    headers: openAIHeaders(config),
    body: JSON.stringify({
      model: config.model.trim() || 'gpt-4o-mini',
      messages: buildOpenAIMessages(config, messages),
      temperature: config.temperature ?? 0.7,
      stream: true,
    }),
    signal,
    onData: (data) => {
      if (data === '[DONE]') return;
      const parsed = tryParseJson(data) as {
        error?: { message?: string };
        choices?: { delta?: { content?: unknown } }[];
      } | null;
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.error?.message) {
        streamError = parsed.error.message;
        return;
      }
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) {
        acc += delta;
        onChunk?.(acc);
      }
    },
  });

  if (streamError) throw new Error(streamError);
  if (!acc) throw new Error('Received an empty response from the AI model.');
  return acc;
}

async function streamAnthropicRequest({
  config,
  messages,
  endpointUrl,
  onChunk,
  signal,
}: {
  config: AiConfig;
  messages: ChatMessage[];
  endpointUrl: string;
  onChunk?: (partialText: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  let acc = '';
  let streamError: string | null = null;

  await postSSE({
    url: endpointUrl,
    headers: {
      'x-api-key': config.apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: config.model.trim() || 'claude-3-5-haiku-20241022',
      system: config.systemPrompt.trim() || undefined,
      messages: buildAnthropicMessages(messages),
      max_tokens: 2048,
      temperature: config.temperature ?? 0.7,
      stream: true,
    }),
    signal,
    onData: (data) => {
      const parsed = tryParseJson(data) as {
        type?: string;
        delta?: { text?: unknown };
        error?: { message?: string };
      } | null;
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.type === 'error') {
        streamError = parsed.error?.message || 'Anthropic stream error.';
        return;
      }
      if (parsed.type === 'content_block_delta' && typeof parsed.delta?.text === 'string') {
        acc += parsed.delta.text;
        onChunk?.(acc);
      }
    },
  });

  if (streamError) throw new Error(streamError);
  if (!acc) throw new Error('Received an empty response from Anthropic API.');
  return acc;
}

async function streamGoogleRequest({
  config,
  messages,
  baseUrl,
  onChunk,
  signal,
}: {
  config: AiConfig;
  messages: ChatMessage[];
  baseUrl: string;
  onChunk?: (partialText: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const cleanDomain = googleBase(config, baseUrl);
  const modelName = config.model.trim() || 'gemini-1.5-flash';
  const url = `${cleanDomain}/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${config.apiKey.trim()}`;

  const bodyPayload: Record<string, unknown> = {
    contents: buildGoogleContents(messages),
    generationConfig: {
      temperature: config.temperature ?? 0.7,
    },
  };
  if (config.systemPrompt.trim()) {
    bodyPayload.systemInstruction = {
      parts: [{ text: config.systemPrompt.trim() }],
    };
  }

  let acc = '';
  let streamError: string | null = null;

  await postSSE({
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
    signal,
    onData: (data) => {
      const parsed = tryParseJson(data) as {
        error?: { message?: string };
        candidates?: { content?: { parts?: { text?: unknown }[] } }[];
      } | null;
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.error?.message) {
        streamError = parsed.error.message;
        return;
      }
      const parts = parsed.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part && typeof part.text === 'string' && part.text) {
            acc += part.text;
          }
        }
        if (acc) onChunk?.(acc);
      }
    },
  });

  if (streamError) throw new Error(streamError);
  if (!acc) throw new Error('Received an empty response from Gemini API.');
  return acc;
}
