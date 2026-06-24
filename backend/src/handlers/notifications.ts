import axios from 'axios';
import { supabase } from '../supabase';
import { Ctx } from '../rpc';

/**
 * Notification kinds:
 * - 'order'      : a new order was confirmed by AI
 * - 'complaint'  : customer expressed dissatisfaction → AI paused, admin notified
 * - 'system'     : generic system notice
 */

export async function createNotification(
  userId: string,
  type: 'order' | 'complaint' | 'system',
  title: string,
  body: string,
  conversationId?: number | null,
  meta?: Record<string, any>,
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body || '',
    conversation_id: conversationId || null,
    meta: meta || null,
  });
  // Fire-and-forget telegram push.
  pushToTelegram(userId, type, title, body, conversationId).catch(() => {});
}

/** Push a notification to the admin's Telegram group via the user's bot token. */
async function pushToTelegram(
  userId: string,
  type: string,
  title: string,
  body: string,
  conversationId?: number | null,
) {
  const { data: profile } = await supabase.from('user_profiles')
    .select('telegram_bot_token, admin_telegram_chat_id')
    .eq('user_id', userId).single();
  const token = profile?.telegram_bot_token;
  const chatId = profile?.admin_telegram_chat_id;
  if (!token || !chatId) return;

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://autoflowchat.shop';
  const icon = type === 'order' ? '🛒' : type === 'complaint' ? '⚠️' : 'ℹ️';
  let text = `${icon} *${title}*\n\n${body}`;
  if (conversationId) {
    text += `\n\n[فتح المحادثة](${FRONTEND_URL}/#/conversations?open=${conversationId})`;
  }
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }, { timeout: 8000 });
  } catch (e: any) {
    console.error('[telegram push]', e?.response?.data || e?.message);
  }
}

export const notificationsHandlers = {
  'notifications:list': async ({ userId }: Ctx, { limit = 50, type }: any = {}) => {
    let q = supabase.from('notifications').select('*').eq('user_id', userId);
    if (type) q = q.eq('type', type);
    const { data } = await q.order('created_at', { ascending: false }).limit(limit);
    return data || [];
  },

  'notifications:unreadCount': async ({ userId }: Ctx) => {
    const { count } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_read', false);
    return { count: count || 0 };
  },

  'notifications:markRead': async ({ userId }: Ctx, { id }: any) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  'notifications:markAllRead': async ({ userId }: Ctx) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    return { success: true };
  },

  'notifications:delete': async ({ userId }: Ctx, { id }: any) => {
    await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  // ---- AI pause controls ----
  'conversations:pauseAI': async ({ userId }: Ctx, { convId, hours = 2 }: any) => {
    const until = new Date(Date.now() + Number(hours) * 3600 * 1000).toISOString();
    await supabase.from('conversations')
      .update({ ai_paused_until: until })
      .eq('id', convId).eq('user_id', userId);
    return { success: true, paused_until: until };
  },

  'conversations:resumeAI': async ({ userId }: Ctx, { convId }: any) => {
    await supabase.from('conversations')
      .update({ ai_paused_until: null })
      .eq('id', convId).eq('user_id', userId);
    return { success: true };
  },

  // ---- Admin Telegram chat id (where alerts go) ----
  'settings:setTelegramAdminChat': async ({ userId }: Ctx, { chat_id }: any) => {
    await supabase.from('user_profiles')
      .update({ admin_telegram_chat_id: String(chat_id || '') })
      .eq('user_id', userId);
    return { success: true };
  },
};
