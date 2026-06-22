import { supabase } from '../supabase';
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

/** Normalize a raw inbound item (Nashir webhook shapes vary) into a common shape. */
function normalize(raw: any) {
  const platformRaw = String(raw.platform || raw.channel || '').toLowerCase();
  const isComment = platformRaw.includes('comment') || raw.message_type === 'comment' || raw.type === 'comment';
  const base = platformRaw.replace('_dm', '').replace('_comment', '') || 'facebook';
  return {
    id: raw.id ?? raw.message_id ?? raw.platform_message_id ?? raw.comment_id ?? `gen_${Date.now()}`,
    base,
    isComment,
    platform: isComment ? `${base}_comment` : `${base}_dm`,
    senderId: String(raw.sender_id ?? raw.from ?? raw.senderId ?? raw.psid ?? ''),
    senderName: String(raw.sender_name ?? raw.senderName ?? raw.name ?? 'عميل'),
    content: String(raw.message ?? raw.text ?? raw.message_text ?? raw.body ?? raw.content ?? ''),
    accountId: raw.account_id ?? raw.page_id ?? raw.pageId ?? null,
  };
}

/**
 * Process one inbound item: store the customer message + AI suggestion.
 * Returns the AI reply text (for the synchronous webhook response).
 */
export async function processInbound(userId: string, raw: any): Promise<string> {
  const item = normalize(raw);
  if (!item.content) { console.warn('[inbound] no content in payload:', JSON.stringify(raw).slice(0, 500)); return ''; }

  const nid = String(item.id);
  const { data: exists } = await supabase.from('messages').select('id').eq('user_id', userId).eq('nashir_message_id', nid).single();

  let conv: any;
  const found = await supabase.from('conversations').select('*')
    .eq('user_id', userId).eq('sender_id', item.senderId).eq('platform', item.platform).single();
  conv = found.data;
  if (!conv) {
    const created = await supabase.from('conversations').insert({
      user_id: userId, platform: item.platform, sender_id: item.senderId, sender_name: item.senderName,
      nashir_account_id: item.accountId, last_message: item.content, last_message_at: new Date().toISOString(), status: 'new',
    }).select().single();
    conv = created.data;
  } else {
    await supabase.from('conversations').update({ last_message: item.content, last_message_at: new Date().toISOString() }).eq('id', conv.id);
  }

  // Generate AI reply.
  let reply = '';
  try {
    const config = await resolveConfig(userId);
    const system = await buildSystemPrompt(userId);
    reply = await sendToAI(config, [{ role: 'system', content: system }, { role: 'user', content: item.content }]);
  } catch (e: any) { console.error('[inbound AI]', e?.message || e); }

  if (!exists) {
    await supabase.from('messages').insert({
      user_id: userId, conversation_id: conv!.id, nashir_message_id: nid,
      sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm', ai_suggestion: reply,
    });
  }
  emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });

  // Only auto-send (return reply for Nashir to deliver) in autopilot mode.
  if (reply && await autoReplyEnabled(userId)) {
    await supabase.from('messages').insert({
      user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: reply, message_type: 'text',
    });
    await supabase.from('conversations').update({ last_message: reply, last_message_at: new Date().toISOString() }).eq('id', conv!.id);
    return reply;
  }
  return '';
}

/**
 * Handle a Nashir webhook payload and return the reply(ies) for Nashir to send
 * back to the customer (Nashir's chatbot custom-webhook expects the reply in the response body).
 */
export async function handleNashirWebhook(userId: string, body: any): Promise<{ reply: string; replies: string[] }> {
  console.log('[nashir webhook] payload:', JSON.stringify(body).slice(0, 1000));
  const items = Array.isArray(body) ? body
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.messages) ? body.messages
    : [body?.message && typeof body.message === 'object' ? body.message : body];
  const replies: string[] = [];
  for (const it of items) {
    try {
      const r = await processInbound(userId, it);
      if (r) replies.push(r);
    } catch (e: any) { console.error('[webhook item]', e?.message || e); }
  }
  return { reply: replies[0] || '', replies };
}
