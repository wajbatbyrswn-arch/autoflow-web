import axios from 'axios';
import { Ctx } from '../rpc';
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

/** All Gemini keys to rotate through: the config key first, then comma-separated env keys. */
function geminiKeys(primary?: string): string[] {
  const envKeys = (process.env.GEMINI_API_KEY || '').split(',').map(s => s.trim()).filter(Boolean);
  const all = [primary, ...envKeys].filter(Boolean) as string[];
  return [...new Set(all)];
}

async function requireAdmin(userId: string) {
  const { data } = await supabase.from('user_profiles').select('is_admin').eq('user_id', userId).single();
  if (!data?.is_admin) throw new Error('Forbidden');
}

/** Global (owner-managed) config store in app_config table. */
export async function getGlobal(key: string): Promise<any> {
  const { data } = await supabase.from('app_config').select('value').eq('key', key).single();
  return data?.value ?? null;
}
export async function setGlobal(key: string, value: any) {
  await supabase.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

/**
 * Resolve the AI config used to reply for a user.
 * Priority: per-user provider override (admin-set) → global default provider (owner-set in AIConfig).
 * The provider's API key + model come from the global config; Gemini falls back to env keys.
 */
export async function resolveConfig(userId: string): Promise<AIConfig> {
  const { data: profile } = await supabase.from('user_profiles')
    .select('ai_provider, ai_model').eq('user_id', userId).single();

  const globalActive = (await getGlobal('ai_active_provider')) as string | null;
  const provider = profile?.ai_provider || globalActive || 'google';

  const pcfg = (await getGlobal(`ai_provider_${provider}`)) || {};
  const apiKey = pcfg.apiKey || (provider === 'google' ? (process.env.GEMINI_API_KEY || '').split(',')[0].trim() : '');
  const model = profile?.ai_model || pcfg.model || (provider === 'google' ? 'gemini-2.5-flash-lite' : '');
  return { provider, model, apiKey, baseUrl: pcfg.baseUrl };
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
    // Rotate among all configured Gemini keys; on 429 (quota/rate limit) try the next.
    const keys = geminiKeys(apiKey);
    let lastErr: any;
    for (const k of keys) {
      try {
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${k}`,
          payload, { timeout: 30000 }
        );
        return res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e: any) {
        lastErr = e;
        if (e?.response?.status === 429) { await new Promise(r => setTimeout(r, 500)); continue; }
        throw e;
      }
    }
    throw lastErr;
  }

  if (provider === 'ollama') {
    const url = normalizeBaseUrl(baseUrl || 'http://localhost:11434');
    const res = await axios.post(`${url}/api/chat`, { model, messages, stream: false }, { timeout: 60000 });
    return res.data.message.content;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export const aiHandlers = {
  // AI config is GLOBAL (owner-managed via the admin-only AIConfig page).
  // The active provider + its model = the default for every user.
  'ai:getConfig': async () => {
    const activeProvider = (await getGlobal('ai_active_provider')) || 'google';
    const cfg = await getGlobal(`ai_provider_${activeProvider}`);
    return cfg ? { ...cfg, provider: activeProvider, activeProvider } : { provider: activeProvider };
  },
  'ai:saveConfig': async ({ userId }: Ctx, config: any) => {
    await requireAdmin(userId);
    await setGlobal(`ai_provider_${config.provider}`, config);
    await setGlobal('ai_active_provider', config.provider);
    return { success: true };
  },
  'ai:getProviderConfig': async (_ctx: Ctx, provider: string) => {
    return (await getGlobal(`ai_provider_${provider}`)) || { provider };
  },
  // For the admin users table: which providers are configured (have a key) + the global default.
  'admin:getAiProviders': async ({ userId }: Ctx) => {
    await requireAdmin(userId);
    const { data } = await supabase.from('app_config').select('key, value').like('key', 'ai_provider_%');
    const providers = (data || [])
      .filter((r: any) => r.value?.apiKey || r.key.endsWith('_ollama'))
      .map((r: any) => ({ provider: r.key.replace('ai_provider_', ''), model: r.value?.model || '' }));
    const active = (await getGlobal('ai_active_provider')) || 'google';
    return { providers, active };
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
  'ai:generateImage': async (_ctx: Ctx, { prompt }: any) => {
    const openaiCfg = await getGlobal('ai_provider_openai');
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
