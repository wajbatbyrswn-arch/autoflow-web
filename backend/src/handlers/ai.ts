import axios from 'axios';
import { Ctx } from '../rpc';
import { getSetting, setSetting } from './settings';
import { supabase } from '../supabase';

function normalizeBaseUrl(url?: string) { return (url || '').replace(/\/+$/, ''); }
function normalizeGoogleModelName(model?: string) {
  if (!model) return 'gemini-2.5-flash-lite';
  let n = String(model).trim();
  if (n.includes('/')) n = n.split('/').pop()!;
  return n;
}
function getBaseUrl(provider: string) {
  const urls: Record<string, string> = {
    openai: 'https://api.openai.com/v1', groq: 'https://api.groq.com/openai/v1',
    mistral: 'https://api.mistral.ai/v1', together: 'https://api.together.xyz/v1',
    openrouter: 'https://openrouter.ai/api/v1',
  };
  return urls[provider] || 'https://api.openai.com/v1';
}

interface AIConfig { provider: string; model?: string; apiKey?: string; baseUrl?: string; }

/** Resolve a user's AI config; fallback to owner's Gemini key + admin-assigned model. */
export async function resolveConfig(userId: string): Promise<AIConfig> {
  const activeProvider = await getSetting(userId, 'active_ai_provider');
  if (activeProvider) {
    const cfg = await getSetting(userId, `ai_config_${activeProvider}`);
    if (cfg && cfg.apiKey) return cfg;
  }
  // Fallback: owner Gemini key + per-user model from profile (admin-controlled)
  const { data: profile } = await supabase.from('user_profiles').select('ai_model').eq('user_id', userId).single();
  return {
    provider: 'google',
    model: profile?.ai_model || 'gemini-2.5-flash-lite',
    apiKey: process.env.GEMINI_API_KEY || '',
  };
}

export async function sendToAI(config: AIConfig, messages: Array<{ role: string; content: string }>): Promise<string> {
  const { provider, model, apiKey, baseUrl } = config;
  if (!provider) throw new Error('No AI provider configured');

  if (['openai', 'groq', 'mistral', 'openrouter'].includes(provider)) {
    const url = normalizeBaseUrl(baseUrl || getBaseUrl(provider));
    const res = await axios.post(`${url}/chat/completions`, {
      model, messages, temperature: 0.7, max_tokens: 1024,
    }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
    return res.data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'anthropic') {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsgs = messages.filter(m => m.role !== 'system');
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model, messages: userMsgs, system: systemMsg, max_tokens: 2048,
    }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, timeout: 60000 });
    return res.data.content?.[0]?.text || '';
  }

  if (provider === 'google') {
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
    }));
    const systemMsg = messages.find(m => m.role === 'system');
    const payload: any = {
      system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      contents, generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    };
    const modelName = normalizeGoogleModelName(model);
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      payload, { timeout: 30000 }
    );
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'ollama') {
    const url = normalizeBaseUrl(baseUrl || 'http://localhost:11434');
    const res = await axios.post(`${url}/api/chat`, { model, messages, stream: false }, { timeout: 60000 });
    return res.data.message.content;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export const aiHandlers = {
  'ai:getConfig': async ({ userId }: Ctx) => {
    const activeProvider = (await getSetting(userId, 'active_ai_provider')) || 'google';
    const cfg = await getSetting(userId, `ai_config_${activeProvider}`);
    return cfg ? { ...cfg, activeProvider } : { provider: activeProvider };
  },
  'ai:saveConfig': async ({ userId }: Ctx, config: any) => {
    await setSetting(userId, `ai_config_${config.provider}`, config);
    await setSetting(userId, 'active_ai_provider', config.provider);
    return { success: true };
  },
  'ai:getProviderConfig': async ({ userId }: Ctx, provider: string) => {
    return (await getSetting(userId, `ai_config_${provider}`)) || { provider };
  },
  'ai:testConnection': async (_ctx: Ctx, config: any) => {
    try {
      const reply = await sendToAI(config, [{ role: 'user', content: 'Say: connection OK' }]);
      return { success: true, message: reply };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || err.message };
    }
  },
  'ai:sendMessage': async ({ userId }: Ctx, { messages, systemPrompt }: any) => {
    const config = await resolveConfig(userId);
    try {
      const all = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;
      const reply = await sendToAI(config, all);
      return { success: true, reply };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || err.message };
    }
  },
  'ai:fetchModels': async (_ctx: Ctx, config: any) => {
    const { provider, apiKey, baseUrl } = config;
    try {
      if (['openai', 'groq', 'mistral', 'openrouter'].includes(provider)) {
        const url = normalizeBaseUrl(baseUrl || getBaseUrl(provider));
        const res = await axios.get(`${url}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 });
        return res.data.data.map((m: any) => m.id).sort();
      }
      if (provider === 'google') {
        const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { timeout: 10000 });
        return res.data.models.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent')).map((m: any) => m.name.replace('models/', ''));
      }
      if (provider === 'anthropic') {
        const res = await axios.get('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, timeout: 10000 });
        return res.data.data.map((m: any) => m.id);
      }
      if (provider === 'ollama') {
        const url = normalizeBaseUrl(baseUrl || 'http://localhost:11434');
        const res = await axios.get(`${url}/api/tags`, { timeout: 5000 });
        return res.data.models.map((m: any) => m.name);
      }
      return [];
    } catch (err: any) {
      return { error: err?.response?.data?.error?.message || err.message };
    }
  },
  'ai:analyzeImage': async ({ userId }: Ctx, { prompt, base64Image }: any) => {
    const config = await resolveConfig(userId);
    try {
      if (config.provider === 'google') {
        const modelName = normalizeGoogleModelName(config.model);
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`, {
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
        });
        return { success: true, reply: res.data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
      }
      if (config.provider === 'openai' || config.provider === 'openrouter') {
        const url = normalizeBaseUrl(config.baseUrl || getBaseUrl(config.provider));
        const res = await axios.post(`${url}/chat/completions`, {
          model: config.model, max_tokens: 1024,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }] }],
        }, { headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } });
        return { success: true, reply: res.data.choices?.[0]?.message?.content || '' };
      }
      throw new Error(`Vision not supported for provider: ${config.provider}`);
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || err.message };
    }
  },
  'ai:generateImage': async ({ userId }: Ctx, { prompt }: any) => {
    const openaiCfg = await getSetting(userId, 'ai_config_openai');
    if (!openaiCfg?.apiKey) return { success: false, error: 'OpenAI API key not configured for image generation' };
    try {
      const url = openaiCfg.baseUrl ? normalizeBaseUrl(openaiCfg.baseUrl) : 'https://api.openai.com/v1';
      const res = await axios.post(`${url}/images/generations`, { model: 'dall-e-3', prompt, n: 1, size: '1024x1024' },
        { headers: { Authorization: `Bearer ${openaiCfg.apiKey}`, 'Content-Type': 'application/json' } });
      return { success: true, url: res.data.data[0].url };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || err.message };
    }
  },
};
