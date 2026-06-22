import { supabase } from '../supabase';
import { nashir, nashirKey } from './nashir';
import { resolveConfig, sendToAI } from './ai';
import { emit } from '../events';

async function buildSystemPrompt(userId: string): Promise<string> {
  const { data: store } = await supabase.from('store_config').select('store_name, system_prompt').eq('user_id', userId).single();
  let prompt = store?.system_prompt || `أنت موظف مبيعات ذكي ومتعاون لمتجر "${store?.store_name || 'AutoFlow'}".`;
  const { data: products } = await supabase.from('products').select('name, price, quantity').eq('user_id', userId).gt('quantity', 0);
  if (products?.length) {
    prompt += '\n\n### المتوفر حالياً ###\n' + products.map(p => `- ${p.name}: ${p.price}، الكمية ${p.quantity}`).join('\n');
  }
  prompt += '\n\nتنبيه: لا تستخدم تنسيق Markdown؛ اكتب نصاً عادياً مختصراً (٣ جمل كحد أقصى) بنفس لغة العميل.';
  return prompt;
}

async function autoReplyEnabled(userId: string): Promise<boolean> {
  const { data } = await supabase.from('app_settings').select('value').eq('user_id', userId).eq('key', 'ai_mode').single();
  try { return JSON.parse(data?.value || '"copilot"') === 'autopilot'; } catch { return false; }
}

/**
 * Normalize a raw inbound item (from Nashir webhook or poll) into a common shape.
 * Nashir payloads vary; accept the common field aliases.
 */
function normalize(raw: any) {
  const platformRaw = String(raw.platform || raw.channel || '').toLowerCase();
  const isComment = platformRaw.includes('comment') || raw.message_type === 'comment' || raw.type === 'comment';
  const base = platformRaw.replace('_dm', '').replace('_comment', '') || 'facebook';
  return {
    id: raw.id ?? raw.message_id ?? raw.platform_message_id ?? raw.comment_id,
    base,                                   // facebook | instagram | whatsapp
    isComment,
    platform: isComment ? `${base}_comment` : `${base}_dm`,
    senderId: String(raw.sender_id ?? raw.from ?? raw.senderId ?? ''),
    senderName: String(raw.sender_name ?? raw.senderName ?? raw.name ?? 'عميل'),
    content: String(raw.message ?? raw.text ?? raw.message_text ?? raw.body ?? ''),
    accountId: raw.account_id ?? raw.page_id ?? raw.pageId ?? null,
  };
}

/** Process one inbound item for a user: store it, get AI suggestion, optionally auto-reply. */
export async function processInbound(userId: string, raw: any) {
  const item = normalize(raw);
  if (!item.id || !item.content) { console.warn('[inbound] skipped (no id/content)', raw); return; }

  const nid = String(item.id);
  const { data: exists } = await supabase.from('messages').select('id').eq('user_id', userId).eq('nashir_message_id', nid).single();
  if (exists) return;

  let { data: conv } = await supabase.from('conversations').select('*')
    .eq('user_id', userId).eq('sender_id', item.senderId).eq('platform', item.platform).single();
  if (!conv) {
    const { data: created } = await supabase.from('conversations').insert({
      user_id: userId, platform: item.platform, sender_id: item.senderId, sender_name: item.senderName,
      nashir_account_id: item.accountId, last_message: item.content, last_message_at: new Date().toISOString(), status: 'new',
    }).select().single();
    conv = created;
  } else {
    await supabase.from('conversations').update({ last_message: item.content, last_message_at: new Date().toISOString() }).eq('id', conv.id);
  }

  let suggestion = '';
  try {
    const config = await resolveConfig(userId);
    const system = await buildSystemPrompt(userId);
    suggestion = await sendToAI(config, [{ role: 'system', content: system }, { role: 'user', content: item.content }]);
  } catch (e: any) { console.error('[inbound AI]', e?.message || e); }

  await supabase.from('messages').insert({
    user_id: userId, conversation_id: conv!.id, nashir_message_id: nid,
    sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm', ai_suggestion: suggestion,
  });

  emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });

  if (suggestion && await autoReplyEnabled(userId)) {
    const key = await nashirKey(userId);
    if (!key) return;
    try {
      if (item.isComment) await nashir.replyComment(key, item.id, suggestion, item.accountId);
      else { await nashir.replyMessage(key, item.id, suggestion, item.accountId); await nashir.markRead(key, item.id).catch(() => {}); }
      await supabase.from('messages').insert({ user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: suggestion, message_type: 'text' });
      await supabase.from('conversations').update({ last_message: suggestion, last_message_at: new Date().toISOString() }).eq('id', conv!.id);
    } catch (e: any) { console.error('[inbound reply]', e?.message || e); }
  }
}

/** Entry point for a Nashir webhook payload (single object or array, possibly wrapped). */
export async function handleNashirWebhook(userId: string, body: any) {
  const items = Array.isArray(body) ? body
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.messages) ? body.messages
    : [body];
  for (const it of items) {
    await processInbound(userId, it).catch(e => console.error('[webhook item]', e?.message || e));
  }
}
