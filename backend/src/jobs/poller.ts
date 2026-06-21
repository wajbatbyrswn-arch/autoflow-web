import cron from 'node-cron';
import { supabase } from '../supabase';
import { nashir, nashirKey } from '../handlers/nashir';
import { resolveConfig, sendToAI } from '../handlers/ai';
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

async function handleItem(userId: string, item: any, isComment: boolean, autoReply: boolean, key: string) {
  const nid = String(item.id);
  const { data: exists } = await supabase.from('messages').select('id').eq('user_id', userId).eq('nashir_message_id', nid).single();
  if (exists) return;

  const platform = isComment ? `${item.platform}_comment` : String(item.platform); // facebook_dm | instagram_dm | facebook_comment ...
  const senderId = String(item.sender_id || '');
  const senderName = String(item.sender_name || 'عميل');
  const content = String(item.message || '');
  const accountId = item.account_id || item.page_id || null;

  let { data: conv } = await supabase.from('conversations').select('*')
    .eq('user_id', userId).eq('sender_id', senderId).eq('platform', platform).single();
  if (!conv) {
    const { data: created } = await supabase.from('conversations').insert({
      user_id: userId, platform, sender_id: senderId, sender_name: senderName,
      nashir_account_id: accountId, last_message: content, last_message_at: new Date().toISOString(), status: 'new',
    }).select().single();
    conv = created;
  } else {
    await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', conv.id);
  }

  // AI suggestion
  let suggestion = '';
  try {
    const config = await resolveConfig(userId);
    const system = await buildSystemPrompt(userId);
    suggestion = await sendToAI(config, [{ role: 'system', content: system }, { role: 'user', content }]);
  } catch (e) { console.error('[poller AI]', e); }

  await supabase.from('messages').insert({
    user_id: userId, conversation_id: conv!.id, nashir_message_id: nid,
    sender: 'customer', content, message_type: isComment ? 'comment' : 'dm', ai_suggestion: suggestion,
  });

  emit(userId, isComment ? `${item.platform}:message` : `${item.platform}:message`, { convId: conv!.id, platform });

  if (autoReply && suggestion) {
    try {
      if (isComment) await nashir.replyComment(key, item.id, suggestion, accountId);
      else { await nashir.replyMessage(key, item.id, suggestion, accountId); await nashir.markRead(key, item.id); }
      await supabase.from('messages').insert({ user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: suggestion, message_type: 'text' });
      await supabase.from('conversations').update({ last_message: suggestion, last_message_at: new Date().toISOString() }).eq('id', conv!.id);
    } catch (e) { console.error('[poller reply]', e); }
  }
}

async function pollUser(user: any) {
  const key = await nashirKey(user.user_id);
  if (!key) return;
  const autoReply = (await getAutoReply(user.user_id));
  try {
    for (const m of await nashir.unreadMessages(key)) await handleItem(user.user_id, m, false, autoReply, key).catch(console.error);
    for (const c of await nashir.unreadComments(key)) await handleItem(user.user_id, c, true, autoReply, key).catch(console.error);
  } catch (e: any) {
    console.error(`[poller user ${user.user_id}]`, e?.message || e);
  }
}

async function getAutoReply(userId: string): Promise<boolean> {
  const { data } = await supabase.from('app_settings').select('value').eq('user_id', userId).eq('key', 'ai_mode').single();
  try { return JSON.parse(data?.value || '"copilot"') === 'autopilot'; } catch { return false; }
}

export function startPoller() {
  cron.schedule('*/2 * * * *', async () => {
    const { data: users } = await supabase.from('user_profiles').select('user_id').eq('subscription_status', 'active');
    for (const u of users || []) await pollUser(u).catch(console.error);
  });
  console.log('Nashir poller started (every 2 min)');
}
