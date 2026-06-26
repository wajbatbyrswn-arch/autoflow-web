import axios from 'axios';
import { supabase } from '../supabase';
import { Ctx } from '../rpc';
import { emit } from '../events';

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
  // Push SSE notification so the browser plays a sound and updates the badge.
  emit(userId, 'notification', { type, title });
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

  // ---- Telegram bot wiring (replaces the broken stub) ----
  'telegram:saveToken': async ({ userId }: Ctx, { token }: any) => {
    const clean = String(token || '').trim();
    if (!clean) {
      await supabase.from('user_profiles').update({ telegram_bot_token: '' }).eq('user_id', userId);
      return { success: true };
    }
    // Verify the token works (getMe)
    try {
      const res = await axios.get(`https://api.telegram.org/bot${clean}/getMe`, { timeout: 6000 });
      if (!res.data?.ok) throw new Error('Invalid token');
      await supabase.from('user_profiles').update({ telegram_bot_token: clean }).eq('user_id', userId);
      return { success: true, bot: res.data.result };
    } catch (e: any) {
      const msg = e?.response?.data?.description || e?.message || 'فشل التحقق من التوكن';
      return { success: false, error: msg };
    }
  },

  'telegram:getStatus': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('user_profiles')
      .select('telegram_bot_token, admin_telegram_chat_id').eq('user_id', userId).single();
    const token = data?.telegram_bot_token;
    const chatId = data?.admin_telegram_chat_id;
    if (!token) return { status: 'disconnected', has_token: false, has_chat: !!chatId };
    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 5000 });
      return { status: 'connected', has_token: true, has_chat: !!chatId, bot: res.data?.result };
    } catch {
      return { status: 'token_invalid', has_token: true, has_chat: !!chatId };
    }
  },

  /**
   * Discover chats/channels/groups where the bot has been added.
   * Telegram doesn't expose "list my chats", so we rely on getUpdates which
   * surfaces every channel_post / my_chat_member event seen recently.
   * The user is instructed to: add the bot as admin → send any message in the channel
   * → press refresh here.
   */
  'telegram:listChats': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('user_profiles').select('telegram_bot_token').eq('user_id', userId).single();
    const token = data?.telegram_bot_token;
    if (!token) return { success: false, error: 'لم يتم حفظ توكن البوت', chats: [] };
    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
        params: {
          // Without allowed_updates the bot won't see channel_post or my_chat_member events.
          allowed_updates: JSON.stringify(['message', 'channel_post', 'my_chat_member', 'chat_member']),
          limit: 100,
        },
        timeout: 10000,
      });
      const updates = res.data?.result || [];
      const chatsMap = new Map();
      for (const u of updates) {
        const chat = u.message?.chat || u.channel_post?.chat
          || u.my_chat_member?.chat || u.chat_member?.chat
          || u.edited_message?.chat || u.edited_channel_post?.chat;
        if (chat && !chatsMap.has(String(chat.id))) {
          chatsMap.set(String(chat.id), {
            id: String(chat.id),
            type: chat.type, // 'private' | 'group' | 'supergroup' | 'channel'
            title: chat.title || chat.username || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || `Chat ${chat.id}`,
            username: chat.username || null,
          });
        }
      }
      return { success: true, chats: Array.from(chatsMap.values()) };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.description || e?.message || 'فشل الجلب', chats: [] };
    }
  },

  // ---- Admin: manage another user's telegram bot from the admin panel ----
  'admin:tgListChatsFor': async ({ userId }: Ctx, { target_user_id }: any) => {
    const adminP = await supabase.from('user_profiles').select('is_admin').eq('user_id', userId).single();
    if (!adminP.data?.is_admin) throw new Error('Forbidden');
    const { data } = await supabase.from('user_profiles').select('telegram_bot_token').eq('user_id', target_user_id).single();
    const token = data?.telegram_bot_token;
    if (!token) return { success: false, error: 'لم يتم حفظ توكن البوت', chats: [] };
    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
        params: {
          allowed_updates: JSON.stringify(['message', 'channel_post', 'my_chat_member', 'chat_member']),
          limit: 100,
        },
        timeout: 10000,
      });
      const updates = res.data?.result || [];
      const chatsMap = new Map();
      for (const u of updates) {
        const chat = u.message?.chat || u.channel_post?.chat
          || u.my_chat_member?.chat || u.chat_member?.chat
          || u.edited_message?.chat || u.edited_channel_post?.chat;
        if (chat && !chatsMap.has(String(chat.id))) {
          chatsMap.set(String(chat.id), {
            id: String(chat.id), type: chat.type,
            title: chat.title || chat.username || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || `Chat ${chat.id}`,
            username: chat.username || null,
          });
        }
      }
      return { success: true, chats: Array.from(chatsMap.values()) };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.description || e?.message || 'فشل الجلب', chats: [] };
    }
  },

  'admin:tgTestFor': async ({ userId }: Ctx, { target_user_id }: any) => {
    const adminP = await supabase.from('user_profiles').select('is_admin').eq('user_id', userId).single();
    if (!adminP.data?.is_admin) throw new Error('Forbidden');
    const { data } = await supabase.from('user_profiles')
      .select('telegram_bot_token, admin_telegram_chat_id, full_name, email').eq('user_id', target_user_id).single();
    const token = data?.telegram_bot_token;
    const chatId = data?.admin_telegram_chat_id;
    if (!token) return { success: false, error: 'لم يتم حفظ توكن البوت' };
    if (!chatId) return { success: false, error: 'لم يتم تحديد القناة' };
    const text = `✅ *AutoFlow Chat — اختبار اتصال (من الإدارة)*\n\nهذه قناة الإشعارات لـ ${data?.full_name || data?.email || target_user_id.slice(0,8)}.\nالبوت جاهز لإرسال إشعارات الطلبات والشكاوى.`;
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text, parse_mode: 'Markdown',
      }, { timeout: 8000 });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.description || e?.message || 'فشل الإرسال' };
    }
  },

  'admin:tgSaveTokenFor': async ({ userId }: Ctx, { target_user_id, token }: any) => {
    const adminP = await supabase.from('user_profiles').select('is_admin').eq('user_id', userId).single();
    if (!adminP.data?.is_admin) throw new Error('Forbidden');
    const clean = String(token || '').trim();
    if (!clean) {
      await supabase.from('user_profiles').update({ telegram_bot_token: '' }).eq('user_id', target_user_id);
      return { success: true };
    }
    try {
      const res = await axios.get(`https://api.telegram.org/bot${clean}/getMe`, { timeout: 6000 });
      if (!res.data?.ok) throw new Error('Invalid token');
      await supabase.from('user_profiles').update({ telegram_bot_token: clean }).eq('user_id', target_user_id);
      return { success: true, bot: res.data.result };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.description || e?.message || 'فشل التحقق' };
    }
  },

  'admin:tgSaveChatFor': async ({ userId }: Ctx, { target_user_id, chat_id }: any) => {
    const adminP = await supabase.from('user_profiles').select('is_admin').eq('user_id', userId).single();
    if (!adminP.data?.is_admin) throw new Error('Forbidden');
    await supabase.from('user_profiles').update({ admin_telegram_chat_id: String(chat_id || '') }).eq('user_id', target_user_id);
    return { success: true };
  },

  'telegram:sendTest': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('user_profiles')
      .select('telegram_bot_token, admin_telegram_chat_id, full_name, email').eq('user_id', userId).single();
    const token = data?.telegram_bot_token;
    const chatId = data?.admin_telegram_chat_id;
    if (!token) return { success: false, error: 'لم يتم حفظ توكن البوت' };
    if (!chatId) return { success: false, error: 'لم يتم تحديد Chat ID للقناة/الجروب' };
    const text = `✅ *AutoFlow Chat — اختبار اتصال*\n\nمرحباً ${data?.full_name || data?.email || ''}.\nالبوت متصل وجاهز لإرسال إشعارات الطلبات والشكاوى إلى هذه القناة.`;
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text, parse_mode: 'Markdown',
      }, { timeout: 8000 });
      return { success: true };
    } catch (e: any) {
      const msg = e?.response?.data?.description || e?.message || 'فشل الإرسال';
      return { success: false, error: msg };
    }
  },
};
