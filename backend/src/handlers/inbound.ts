import { supabase } from '../supabase';
import { nashir, nashirKey } from './nashir';
import { resolveConfig, sendToAI } from './ai';
import { emit } from '../events';
import { createNotification } from './notifications';

// Arabic + English keywords that strongly suggest a customer complaint.
const COMPLAINT_PATTERNS = [
  'شكوى','شكوي','اشتكي','أشكي','أشتكي','مشكلة','مشكله','مشاكل','زعلان','منزعج',
  'سيء','سيئة','سيئه','تعبت','استغل','نصب','احتيال','غش','مزور','تعب',
  'بدي اشكي','مدير','الإدارة','الاداره','بدي ارجاع','استرجاع','استرداد',
  'تأخير','تاخير','تاخرتو','ما وصل','مش وصل','لم يصل','wrong','complaint','refund','angry','disappointed',
  'مغشوش','تالف','مكسور','عاطل','ما يشتغل','مش شغال','لا يعمل','معطل',
];

function looksLikeComplaint(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return COMPLAINT_PATTERNS.some(k => lower.includes(k.toLowerCase()));
}

const COMPLAINT_REPLY = 'تم إيصال مشكلتك للإدارة، سيتم التواصل معك في أقرب وقت ممكن. شكراً لصبرك. 🙏';

const PAUSE_HOURS_COMPLAINT = 2;

async function buildSystemPrompt(userId: string): Promise<string> {
  const { data: store } = await supabase.from('store_config').select('store_name, system_prompt').eq('user_id', userId).single();
  let prompt = store?.system_prompt || `أنت موظف مبيعات ذكي ومتعاون لمتجر "${store?.store_name || 'AutoFlow'}".`;
  const { data: products } = await supabase.from('products').select('name, price, quantity').eq('user_id', userId).gt('quantity', 0);
  if (products?.length) {
    prompt += '\n\n### المتوفر حالياً ###\n' + products.map(p => `- ${p.name}: ${p.price}، الكمية ${p.quantity}`).join('\n');
  }
  prompt += '\n\nقواعد الرد الإلزامية:\n1. لا تستخدم أي رموز تنسيق مثل * أو ** أو _ أو # أو - في ردودك. اكتب نصاً عادياً فقط.\n2. اكتب 3 جمل كحد أقصى بنفس لغة العميل.\n3. عندما يُؤكد العميل طلبه، ضع بيانات الطلب مباشرةً في بداية ردك بهذا الشكل الحرفي ثم أكمل رسالتك العادية:\n[ORDER_READY]{"customer_name":"...","customer_phone":"...","customer_city":"...","customer_area":"...","products":[{"name":"...","quantity":1,"price":0}],"total_amount":0}[/ORDER_READY]';
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
    // Numeric internal id used to reply via Nashir REST (kept separately for manual replies).
    replyId: raw.nashir_message_id ?? raw.id ?? raw.message_id,
    // Dedup on the platform message id (stable & unique per inbound message).
    dedupKey: String(raw.platform_message_id ?? raw.nashir_message_id ?? raw.id ?? `gen_${Date.now()}`),
    base,
    isComment,
    // Conversation platform = base (facebook|instagram|whatsapp) so the inbox filter
    // tabs and platform icons match. DM vs comment is tracked on the message row.
    platform: base,
    senderId: String(raw.sender_id ?? raw.from ?? raw.senderId ?? ''),
    senderName: String(raw.sender_name ?? raw.senderName ?? raw.name ?? 'عميل'),
    content: String(raw.message ?? raw.text ?? raw.message_text ?? raw.body ?? raw.content ?? ''),
    pageId: raw.page_id ?? raw.pageId ?? null,
  };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/_(.*?)_/gs, '$1')
    .replace(/~~(.*?)~~/gs, '$1')
    .replace(/`(.*?)`/gs, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

async function maybeExtractAndSaveOrder(
  reply: string, userId: string, convId: number, platform: string, senderName: string
): Promise<string> {
  const match = reply.match(/\[ORDER_READY\]([\s\S]*?)\[\/ORDER_READY\]/);
  if (!match) return reply;

  try {
    const orderData = JSON.parse(match[1].trim());
    const products = orderData.products || [];
    const total = orderData.total_amount
      || products.reduce((s: number, p: any) => s + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0);
    const orderNum = 'ORD-' + Date.now();
    await supabase.from('orders').insert({
      user_id: userId,
      order_number: orderNum,
      customer_name: orderData.customer_name || senderName,
      customer_phone: orderData.customer_phone || '',
      customer_city: orderData.customer_city || '',
      customer_area: orderData.customer_area || '',
      customer_notes: orderData.notes || '',
      products_json: JSON.stringify(products),
      total_amount: total,
      platform,
      conversation_id: convId,
      status: 'new',
    });
    console.log(`[inbound] order saved: ${orderNum} for conv ${convId}`);

    // Push a notification (DB + Telegram bot if configured).
    const productLines = products.map((p: any) => `• ${p.name} × ${p.quantity}`).join('\n');
    createNotification(
      userId, 'order',
      `طلب جديد #${orderNum}`,
      `العميل: ${orderData.customer_name || senderName}\nالهاتف: ${orderData.customer_phone || '—'}\nالمدينة: ${orderData.customer_city || ''} ${orderData.customer_area || ''}\nالإجمالي: ${total}\n${productLines}`,
      convId,
      { order_number: orderNum, total },
    ).catch(() => {});
  } catch (e: any) {
    console.error('[inbound order parse]', e?.message || e);
  }

  // Strip the tag block from the reply sent to the customer
  return reply.replace(/\[ORDER_READY\][\s\S]*?\[\/ORDER_READY\]/g, '').trim();
}

/** Mark conversation as AI-paused for N hours. */
async function pauseConversationAI(convId: number, hours: number) {
  const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  await supabase.from('conversations').update({ ai_paused_until: until }).eq('id', convId);
}

/** Is AI currently paused for this conversation? */
function isAIPaused(conv: any): boolean {
  if (!conv?.ai_paused_until) return false;
  return new Date(conv.ai_paused_until) > new Date();
}

/**
 * Compress old messages into a summary and store it on the conversation.
 * Called in background when history exceeds COMPRESS_THRESHOLD.
 */
async function maybeCompressHistory(convId: number, userId: string, config: any) {
  const COMPRESS_THRESHOLD = 20; // compress after 20 messages total
  const KEEP_RECENT = 10;        // keep last 10 as live context

  // Count total messages in this conversation
  const { count } = await supabase.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', convId);

  if ((count || 0) < COMPRESS_THRESHOLD) return;

  // Fetch messages to compress (everything except the last KEEP_RECENT)
  const { data: allMsgs } = await supabase.from('messages')
    .select('sender, content, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(count! - KEEP_RECENT);

  if (!allMsgs?.length) return;

  // Also get existing summary to fold into
  const { data: conv } = await supabase.from('conversations')
    .select('context_summary').eq('id', convId).single();

  const prevSummary = conv?.context_summary || '';
  const transcript = allMsgs
    .filter((m: any) => m.content)
    .map((m: any) => `${m.sender === 'customer' ? 'عميل' : 'مساعد'}: ${m.content}`)
    .join('\n');

  const summaryPrompt = prevSummary
    ? `لديك ملخص سابق للمحادثة:\n${prevSummary}\n\nوهذه رسائل إضافية:\n${transcript}\n\nأنشئ ملخصاً موحداً ومحدثاً بالعربية (أقل من 300 كلمة) يحتفظ بالمعلومات الجوهرية: اسم العميل، رقم الهاتف، العنوان، الطلبات، والقرارات المهمة. تجاهل التحيات والكلام العام.`
    : `لديك محادثة بين عميل ومساعد:\n${transcript}\n\nأنشئ ملخصاً بالعربية (أقل من 300 كلمة) يحتفظ بالمعلومات الجوهرية: اسم العميل، رقم الهاتف، العنوان، الطلبات، والقرارات المهمة. تجاهل التحيات والكلام العام.`;

  try {
    const summary = await sendToAI(config, [
      { role: 'user', content: summaryPrompt },
    ]);
    if (summary) {
      await supabase.from('conversations')
        .update({ context_summary: summary })
        .eq('id', convId);
      console.log(`[inbound] compressed history for conv ${convId} (${count} msgs → summary)`);
    }
  } catch (e: any) {
    console.error('[inbound compress]', e?.message || e);
  }
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

  // ---- Complaint detection (runs BEFORE AI to short-circuit) ----
  if (looksLikeComplaint(item.content) && !isAIPaused(conv)) {
    // Insert the customer's message
    if (!exists) {
      await supabase.from('messages').insert({
        user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
        nashir_reply_id: item.replyId ? String(item.replyId) : null,
        sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm', ai_suggestion: COMPLAINT_REPLY,
      });
    }
    // Pause AI for 2h on this conv
    await pauseConversationAI(conv!.id, PAUSE_HOURS_COMPLAINT);
    // Create complaint notification (DB + telegram)
    createNotification(
      userId, 'complaint',
      `شكوى من ${item.senderName}`,
      `العميل: ${item.senderName}\nالمنصة: ${item.platform}\nالرسالة:\n"${item.content.slice(0, 300)}"\n\nتم إيقاف الرد الذكي لمدة ${PAUSE_HOURS_COMPLAINT} ساعة على هذه المحادثة.`,
      conv!.id,
      { sender_id: item.senderId, message: item.content },
    ).catch(() => {});

    // Send the canned reply via Nashir if auto-reply is on and we have a replyId
    if (item.replyId && await autoReplyEnabled(userId)) {
      const key = await nashirKey(userId);
      if (key) {
        try {
          if (item.isComment) await nashir.replyComment(key, item.replyId, COMPLAINT_REPLY);
          else await nashir.replyMessage(key, item.replyId, COMPLAINT_REPLY);
          await supabase.from('messages').insert({
            user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: COMPLAINT_REPLY, message_type: 'text',
          });
        } catch (e: any) { console.error('[inbound complaint reply]', e?.message || e); }
      }
    }
    emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });
    emit(userId, 'notification', { type: 'complaint' });
    return COMPLAINT_REPLY;
  }

  // ---- AI pause check: skip AI if conversation is paused (manual takeover or complaint) ----
  if (isAIPaused(conv)) {
    if (!exists) {
      await supabase.from('messages').insert({
        user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
        nashir_reply_id: item.replyId ? String(item.replyId) : null,
        sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm',
      });
    }
    emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });
    return '';
  }

  let reply = '';
  try {
    const config = await resolveConfig(userId);
    const system = await buildSystemPrompt(userId);

    // Build context: use compressed summary (if any) + last 10 live messages.
    // This gives the AI a full picture without blowing the context window.
    const LIVE_WINDOW = 10;
    const { data: recentMsgs } = await supabase.from('messages')
      .select('sender, content')
      .eq('conversation_id', conv!.id)
      .order('created_at', { ascending: false })
      .limit(LIVE_WINDOW);

    // Reverse so oldest-first for the AI
    const liveMsgs = (recentMsgs || []).reverse()
      .filter((m: any) => m.content)
      .map((m: any) => ({ role: m.sender === 'customer' ? 'user' : 'assistant', content: m.content }));

    // Prepend compressed summary as a system note if it exists
    const summaryNote = conv!.context_summary
      ? `\n\n[ملخص المحادثة السابقة مع هذا العميل:\n${conv!.context_summary}\n]`
      : '';

    reply = await sendToAI(config, [
      { role: 'system', content: system + summaryNote },
      ...liveMsgs,
      { role: 'user', content: item.content },
    ]);

    // Extract [ORDER_READY] tag → save order to DB, strip from reply
    reply = await maybeExtractAndSaveOrder(reply, userId, conv!.id, item.platform, item.senderName);

    // Strip any remaining markdown symbols (safety net)
    reply = stripMarkdown(reply);

    // Trigger background compression once history grows large (fire-and-forget, don't block reply)
    maybeCompressHistory(conv!.id, userId, config).catch(() => {});
  } catch (e: any) { console.error('[inbound AI]', e?.message || e); }

  if (!exists) {
    await supabase.from('messages').insert({
      user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
      nashir_reply_id: item.replyId ? String(item.replyId) : null,
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
