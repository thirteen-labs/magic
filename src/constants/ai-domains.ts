export interface DomainPreset {
  id: string;
  name: string;
  domain: string;
  defaultModel: string;
  suggestedModels: string[];
  protocol: 'openai' | 'anthropic' | 'google';
  path: string;
  authHeader: 'bearer' | 'x-api-key' | 'param';
}

export const PREDEFINED_DOMAINS: DomainPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    domain: 'api.openai.com',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'o3-mini'],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    domain: 'api.anthropic.com',
    defaultModel: 'claude-3-5-haiku-20241022',
    suggestedModels: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    protocol: 'anthropic',
    path: '/v1/messages',
    authHeader: 'x-api-key',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    domain: 'generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-flash',
    suggestedModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    protocol: 'google',
    path: '/v1beta/models',
    authHeader: 'param',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    domain: 'api.deepseek.com',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
  {
    id: 'groq',
    name: 'Groq',
    domain: 'api.groq.com/openai',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
  {
    id: 'together',
    name: 'Together AI',
    domain: 'api.together.xyz',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    suggestedModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    domain: 'openrouter.ai/api',
    defaultModel: 'auto',
    suggestedModels: ['auto', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'google/gemini-flash-1.5'],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
  {
    id: 'opencode',
    name: 'OpenCode Zen',
    domain: 'opencode.ai/zen',
    defaultModel: 'big-pickle',
    suggestedModels: [
      'big-pickle',
      'kimi-k3',
      'glm-5.3',
      'deepseek-v4-flash',
      'minimax-m2.5',
      'space-bunny-free',
    ],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
  {
    id: 'custom',
    name: 'Custom Domain / Endpoint',
    domain: '',
    defaultModel: 'default',
    suggestedModels: [],
    protocol: 'openai',
    path: '/v1/chat/completions',
    authHeader: 'bearer',
  },
];

export const DEFAULT_PRESET_ID = 'openai';
