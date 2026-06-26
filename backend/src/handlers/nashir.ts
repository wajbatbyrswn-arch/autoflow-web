import axios from 'axios';
import { supabase } from '../supabase';
import { Ctx } from '../rpc';

const NASHIR_BASE = process.env.NASHIR_BASE_URL || 'https://nashir.ai/api/v1';

/** Resolve the Nashir API key for a user (their own, else owner fallback). */
export async function nashirKey(userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_profiles').select('nashir_api_key').eq('user_id', userId).single();
  return (data?.nashir_api_key && data.nashir_api_key.trim()) || process.env.NASHIR_API_KEY || null;
}

function client(key: string) {
  return axios.create({ baseURL: NASHIR_BASE, headers: { Authorization: `Bearer ${key}` }, timeout: 20000 });
}

export const nashir = {
  accounts: (key: string) => client(key).get('/accounts').then(r => r.data.data || []),
  unreadMessages: (key: string, accountId?: string) =>
    client(key).get('/messages', { params: { is_read: false, limit: 50, ...(accountId ? { account_id: accountId } : {}) } }).then(r => r.data.data || []),
  unreadComments: (key: string, accountId?: string) =>
    client(key).get('/comments', { params: { is_read: false, limit: 50, ...(accountId ? { account_id: accountId } : {}) } }).then(r => r.data.data || []),
  replyMessage: (key: string, id: number | string, message: string, pageId?: string) =>
    client(key).post(`/messages/${id}/reply`, { message, ...(pageId ? { pageId } : {}) }).then(r => r.data),
  replyComment: (key: string, id: number | string, message: string, pageId?: string) =>
    client(key).post(`/comments/${id}/reply`, { message, ...(pageId ? { pageId } : {}) }).then(r => r.data),
  markRead: (key: string, id: number | string) => client(key).patch(`/messages/${id}/read`).then(r => r.data),
  createPost: (key: string, body: any) => client(key).post('/posts', body).then(r => r.data),
};

async function statusFor(userId: string, platform: 'facebook' | 'instagram') {
  const key = await nashirKey(userId);
  if (!key) return { connected: false, accounts: [] };
  try {
    const all = await nashir.accounts(key);
    const accounts = all.filter((a: any) => platform === 'instagram' ? a.platform === 'instagram' : a.platform === 'facebook');
    return { connected: accounts.length > 0, accounts };
  } catch {
    return { connected: false, accounts: [] };
  }
}

const NASHIR_DASHBOARD = 'https://nashir.ai/dashboard';

export const nashirHandlers = {
  // ---- Connection management UI (Settings → Platforms) ----
  // Returns the Nashir connection state + connected accounts grouped by platform.
  'nashir:status': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('user_profiles')
      .select('nashir_api_key, nashir_account_ids, nashir_linked_platforms, is_admin').eq('user_id', userId).single();
    const ownKey = (data?.nashir_api_key || '').trim();
    const key = ownKey || process.env.NASHIR_API_KEY || '';
    const assigned: string[] = Array.isArray(data?.nashir_account_ids) ? data!.nashir_account_ids.map(String) : [];
    const result: any = {
      hasKey: !!ownKey,
      usingOwnerKey: !ownKey && !!process.env.NASHIR_API_KEY,
      dashboardUrl: NASHIR_DASHBOARD,
      platforms: { whatsapp: [], instagram: [], facebook: [], telegram: [] },
      connectedCount: 0,
      error: null,
    };
    if (key) {
      try {
        let accounts = await nashir.accounts(key);
        // A normal client sees only the pages the admin assigned to them.
        // An admin with no assignment sees everything (for management/testing).
        if (assigned.length) accounts = accounts.filter((a: any) => assigned.includes(String(a.pageId)));
        else if (!data?.is_admin) accounts = [];
        for (const a of accounts) {
          const p = String(a.platform || '').toLowerCase();
          if (result.platforms[p]) result.platforms[p].push(a);
        }
        result.connectedCount = accounts.length;
      } catch (e: any) {
        result.error = e?.response?.status === 401 ? 'مفتاح API غير صحيح' : (e?.message || 'تعذّر الاتصال بناشر');
      }
    }

    // PRIMARY FALLBACK: admin-set linked platforms are the ground truth — they reflect
    // exactly what the admin has wired up for this user, instantly (no need to wait for
    // first traffic). Pre-populate any platform admin assigned that isn't already in result.
    const adminPlatforms: string[] = Array.isArray(data?.nashir_linked_platforms) ? data!.nashir_linked_platforms : [];
    for (const p of adminPlatforms) {
      const key = String(p || '').toLowerCase();
      if (!result.platforms[key]) continue;
      if (result.platforms[key].length === 0) {
        result.platforms[key].push({ pageId: 'admin', pageName: 'مربوط من قبل الفريق ✓', platform: key, _admin: true });
        result.connectedCount++;
      }
    }

    // SECONDARY FALLBACK: if still nothing showed, derive connected platforms from real
    // inbound traffic. If we received messages from a platform in the last 30 days, it's
    // clearly connected — the API check is just for cosmetics.
    if (result.connectedCount === 0) {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: convs } = await supabase.from('conversations')
        .select('platform').eq('user_id', userId).gte('last_message_at', since);
      const seen = new Set((convs || []).map((c: any) => String(c.platform || '').toLowerCase()));
      let derived = 0;
      for (const p of seen) {
        if (!p || !result.platforms[p]) continue;
        if (result.platforms[p].length === 0) {
          result.platforms[p].push({ pageId: 'derived', pageName: 'مربوط ✓ (مؤكَّد من الرسائل)', platform: p, _derived: true });
          derived++;
        }
      }
      result.connectedCount += derived;
      if (derived > 0) result.error = null;
    }

    return result;
  },

  'nashir:saveKey': async ({ userId }: Ctx, { apiKey }: any) => {
    const key = String(apiKey || '').trim();
    if (!key) {
      await supabase.from('user_profiles').update({ nashir_api_key: '' }).eq('user_id', userId);
      return { success: true, cleared: true };
    }
    // Validate by listing accounts.
    try {
      await nashir.accounts(key);
    } catch (e: any) {
      return { success: false, error: e?.response?.status === 401 ? 'مفتاح غير صحيح' : 'فشل التحقق من المفتاح' };
    }
    await supabase.from('user_profiles').update({ nashir_api_key: key }).eq('user_id', userId);
    return { success: true };
  },

  // Facebook / Instagram status come from Nashir's connected accounts.
  'facebook:getStatus': async ({ userId }: Ctx) => statusFor(userId, 'facebook'),
  'instagram:getStatus': async ({ userId }: Ctx) => statusFor(userId, 'instagram'),

  // Reply to a comment by Nashir comment id.
  'facebook:replyComment': async ({ userId }: Ctx, { commentId, message }: any) => {
    const key = await nashirKey(userId);
    if (!key) return { success: false, error: 'Nashir not connected' };
    await nashir.replyComment(key, commentId, message);
    return { success: true };
  },
  'instagram:replyComment': async ({ userId }: Ctx, { commentId, message }: any) => {
    const key = await nashirKey(userId);
    if (!key) return { success: false, error: 'Nashir not connected' };
    await nashir.replyComment(key, commentId, message);
    return { success: true };
  },

  // Direct sends require a Nashir message id; the inbox reply flow uses inbox:reply.
  'facebook:sendMessage': async () => ({ success: false, error: 'use inbox reply' }),
  'instagram:sendMessage': async () => ({ success: false, error: 'use inbox reply' }),
  'facebook:getComments': async () => [],
  'instagram:getComments': async () => [],

  // Connect flow: in the Nashir model the user links accounts on nashir.ai.
  'oauth:facebook': async () => ({ success: false, error: 'اربط حساباتك من لوحة ناشر ثم أدخل مفتاح API في الإعدادات' }),
  'facebook:getPages': async () => [],
  'facebook:connect': async () => ({ success: false, error: 'use Nashir' }),
  'facebook:connectWithPage': async () => ({ success: false, error: 'use Nashir' }),
  'instagram:connect': async () => ({ success: false, error: 'use Nashir' }),
  'instagram:getFromPage': async () => [],
  'instagram:connectFromPage': async () => ({ success: false, error: 'use Nashir' }),

  // Inbox reply: reply to the latest customer message in a conversation via Nashir.
  'inbox:reply': async ({ userId }: Ctx, { conversation_id, message }: any) => {
    const key = await nashirKey(userId);
    if (!key) return { success: false, error: 'Nashir not connected' };
    const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversation_id).eq('user_id', userId).single();
    if (!conv) return { success: false, error: 'conversation not found' };
    const { data: lastCust } = await supabase.from('messages')
      .select('nashir_message_id, nashir_reply_id, message_type').eq('conversation_id', conversation_id).eq('sender', 'customer')
      .order('created_at', { ascending: false }).limit(1).single();
    // Prefer the numeric reply id; fall back to the stored id for older rows.
    const nid = lastCust?.nashir_reply_id || lastCust?.nashir_message_id;
    if (!nid) return { success: false, error: 'no message id' };

    // Omit pageId — Nashir resolves the page from the message itself.
    const isComment = lastCust?.message_type === 'comment';
    try {
      if (isComment) await nashir.replyComment(key, nid, message);
      else await nashir.replyMessage(key, nid, message);
    } catch (e: any) {
      const detail = e?.response?.data?.error || e?.response?.data || e?.message || 'reply failed';
      console.error('[inbox:reply] Nashir', e?.response?.status, JSON.stringify(detail));
      return { success: false, error: `Nashir: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` };
    }

    await supabase.from('messages').insert({
      user_id: userId, conversation_id, sender: 'agent', content: message, message_type: 'text',
    });
    // Manual takeover → pause AI on this conversation for 2 hours so it doesn't
    // talk over the human agent who just stepped in.
    const pausedUntil = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    await supabase.from('conversations').update({
      last_message: message,
      last_message_at: new Date().toISOString(),
      ai_paused_until: pausedUntil,
    }).eq('id', conversation_id);
    return { success: true, ai_paused_until: pausedUntil };
  },
};
