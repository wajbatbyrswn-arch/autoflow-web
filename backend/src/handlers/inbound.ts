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
 * Normalize Nashir's real webhook payload, e.g.:
 * { business_id, team_id, platform:"facebook"|"instagram", message_type:"dm"|"comment",
 *   message, sender_id, sender_name, page_id, platform_message_id, nashir_message_id, account_id }
 */
function normalize(raw: any) {
  const base = String(raw.platform || raw.channel || 'facebook').toLowerCase().replace('_dm', '').replace('_comment', '');
  const mtype = String(raw.message_type || raw.type || 'dm').toLowerCase();
  const isComment = mtype === 'comment';
  return {
    // The id used to reply via Nashir REST is the internal nashir_message_id.
    replyId: raw.nashir_message_id ?? raw.id ?? raw.message_id,
    dedupKey: String(raw.platform_message_id ?? raw.nashir_message_id ?? raw.id ?? `gen_${Date.now()}`),
    base,
    isComment,
    platform: `${base}_${isComment ? 'comment' : 'dm'}`,
    senderId: String(raw.sender_id ?? raw.from ?? raw.senderId ?? ''),
    senderName: String(raw.sender_name ?? raw.senderName ?? raw.name ?? 'عميل'),
    content: String(raw.message ?? raw.text ?? raw.message_text ?? raw.body ?? raw.content ?? ''),
    pageId: raw.page_id ?? raw.pageId ?? null,
  };
}

/** Process one inbound item: store it, get AI reply, and SEND it back via Nashir REST. Returns the reply text. */
export async function processInbound(userId: string, raw: any): Promise<string> {
  const item = normalize(raw);
  if (!item.content) { console.warn('[inbound] no content:', JSON.stringify(raw).slice(0, 400)); return ''; }

  const { data: exists } = await supabase.from('messages').select('id').eq('user_id', userId).eq('nashir_message_id', item.dedupKey).single();

  let conv: any;
  const found = await supabase.from('conversations').select('*')
    .eq('user_id', userId).eq('sender_id', item.senderId).eq('platform', item.platform).single();
  conv = found.data;
  if (!conv) {
    const created = await supabase.from('conversations').insert({
      user_id: userId, platform: item.platform, sender_id: item.senderId, sender_name: item.senderName,
      nashir_account_id: item.pageId, last_message: item.content, last_message_at: new Date().toISOString(), status: 'new',
    }).select().single();
    conv = created.data;
  } else {
    await supabase.from('conversations').update({ last_message: item.content, last_message_at: new Date().toISOString() }).eq('id', conv.id);
  }

  let reply = '';
  try {
    const config = await resolveConfig(userId);
    const system = await buildSystemPrompt(userId);
    reply = await sendToAI(config, [{ role: 'system', content: system }, { role: 'user', content: item.content }]);
  } catch (e: any) { console.error('[inbound AI]', e?.message || e); }

  if (!exists) {
    await supabase.from('messages').insert({
      user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
      sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm', ai_suggestion: reply,
    });
  }
  emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });

  // Auto-send the reply to the platform via Nashir REST (the actual delivery path).
  if (reply && item.replyId && await autoReplyEnabled(userId)) {
    const key = await nashirKey(userId);
    if (key) {
      try {
        // Omit pageId — Nashir resolves the correct page from the message itself.
        // (Passing the IG id makes Nashir look for a FB account with that id and fail.)
        if (item.isComment) await nashir.replyComment(key, item.replyId, reply);
        else await nashir.replyMessage(key, item.replyId, reply);
        await supabase.from('messages').insert({
          user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: reply, message_type: 'text',
        });
        await supabase.from('conversations').update({ last_message: reply, last_message_at: new Date().toISOString() }).eq('id', conv!.id);
        console.log(`[inbound] replied via Nashir REST to ${item.platform} msg ${item.replyId}`);
      } catch (e: any) {
        console.error('[inbound reply REST]', e?.response?.status, JSON.stringify(e?.response?.data || e?.message).slice(0, 300));
      }
    }
  }
  return reply;
}

/** Handle a Nashir webhook payload; also returns the reply (in case Nashir uses the response). */
export async function handleNashirWebhook(userId: string, body: any): Promise<{ reply: string; replies: string[] }> {
  console.log('[nashir webhook] payload:', JSON.stringify(body).slice(0, 800));
  const items = Array.isArray(body) ? body
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.messages) ? body.messages
    : [body];
  const replies: string[] = [];
  for (const it of items) {
    try { const r = await processInbound(userId, it); if (r) replies.push(r); }
    catch (e: any) { console.error('[webhook item]', e?.message || e); }
  }
  return { reply: replies[0] || '', replies };
}
