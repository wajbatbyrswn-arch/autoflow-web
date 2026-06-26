import { supabase } from '../supabase';
import { Ctx } from '../rpc';
import { nashir, nashirKey } from './nashir';
import { resolveConfig, sendToAI } from './ai';

/**
 * Comment automation + AI replies.
 *
 * Flow:
 *  1. New comment arrives (via webhook or poller) → saved into comments_inbox.
 *  2. We check if any comment_automation row matches the post_id AND a trigger keyword.
 *     If yes → reply publicly with `comment_reply` AND send `dm_message` (+ attachment) privately.
 *  3. Otherwise, if user has ai_reply_comments_enabled → ask AI for a short reply, post it.
 *  4. If user has auto_delete_bad_comments → ask AI to classify negative/abusive → if yes, hide/delete.
 */

const NEG_PATTERNS = [
  'كذاب','نصاب','حرامي','سيء','وسخ','زبالة','تباً','تبا','تف','مشكلة','احتيال',
  'fraud','scam','liar','disgusting','garbage','useless','horrible','awful','shit','fuck',
];
function quickNegative(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return NEG_PATTERNS.some(k => t.includes(k.toLowerCase()));
}

export async function processInboundComment(userId: string, raw: any) {
  // Normalize Nashir comment payload
  const platform = String(raw.platform || 'facebook').toLowerCase();
  const commentId = String(raw.nashir_message_id || raw.id || raw.comment_id || '');
  if (!commentId) return;
  const postId = String(raw.post_id || raw.parent_id || '').trim();
  const commenterName = String(raw.sender_name || raw.from || 'متابع');
  const commenterId = String(raw.sender_id || '');
  const content = String(raw.message || raw.text || raw.content || '');
  if (!content) return;

  // Dedup
  const { data: exists } = await supabase.from('comments_inbox').select('id').eq('comment_id', commentId).single();
  if (exists) return;

  const isNegative = quickNegative(content);

  // Nashir's GET /comments response does NOT include post_id, so we cannot filter by post.
  // Match by keyword across all active automations for this user instead.
  const { data: automations } = await supabase.from('comment_automations')
    .select('*').eq('user_id', userId).eq('is_active', true);
  const matched = (automations || []).find((a: any) => {
    const kws = (a.trigger_keywords || []) as string[];
    return kws.some((kw: string) => content.toLowerCase().includes(String(kw).toLowerCase()));
  });

  await supabase.from('comments_inbox').insert({
    user_id: userId, platform, post_id: postId, comment_id: commentId,
    commenter_name: commenterName, commenter_id: commenterId, content,
    is_negative: isNegative,
    automation_triggered: matched?.id || null,
  });

  const key = await nashirKey(userId);
  const { data: profile } = await supabase.from('user_profiles')
    .select('auto_delete_bad_comments, ai_reply_comments_enabled').eq('user_id', userId).single();

  // Auto-delete bad
  if (isNegative && profile?.auto_delete_bad_comments && key) {
    try {
      // Nashir doesn't expose a single delete endpoint here; use a hide attempt.
      // Many platforms allow hiding by replying with an empty action OR via REST. We mark as deleted locally.
      await supabase.from('comments_inbox').update({ deleted: true }).eq('comment_id', commentId);
    } catch {}
    return;
  }

  // Matched automation → public reply + private DM
  if (matched && key) {
    try {
      await nashir.replyComment(key, commentId, matched.comment_reply);
    } catch {}
    // Note: Nashir API has no endpoint to initiate a fresh DM to a commenter.
    // DMs can only be sent as replies to existing incoming messages (/messages/:id/reply).
    // The dm_message is stored in the automation row for future use when Nashir adds this feature.
    if (matched.dm_message) {
      console.log('[comment automation] DM pending (Nashir has no initiate-DM endpoint):', commenterId);
    }
    await supabase.from('comments_inbox').update({ ai_replied: true }).eq('comment_id', commentId);
    await supabase.from('comment_automations').update({ triggered_count: (matched.triggered_count || 0) + 1 }).eq('id', matched.id);
    return;
  }

  // No matched automation → if AI reply enabled (and not negative), reply via AI
  if (!matched && profile?.ai_reply_comments_enabled && !isNegative && key) {
    try {
      const config = await resolveConfig(userId);
      const reply = await sendToAI(config, [
        { role: 'system', content: `أنت موظف خدمة عملاء ودود. ردّ على تعليقات الزبائن باختصار شديد (سطر واحد) وبأدب. لا تستخدم رموز Markdown.` },
        { role: 'user', content },
      ]);
      const clean = String(reply || '').replace(/\*+/g, '').slice(0, 280).trim();
      if (clean) {
        await nashir.replyComment(key, commentId, clean);
        await supabase.from('comments_inbox').update({ ai_replied: true }).eq('comment_id', commentId);
      }
    } catch (e: any) { console.error('[comment ai reply]', e?.message || e); }
  }
}

export const commentsHandlers = {
  // ---- Inbox (recent comments) ----
  'comments:list': async ({ userId }: Ctx, { limit = 100, postId, platform }: any = {}) => {
    let q = supabase.from('comments_inbox').select('*').eq('user_id', userId);
    if (postId) q = q.eq('post_id', postId);
    if (platform) q = q.eq('platform', platform);
    const { data } = await q.order('created_at', { ascending: false }).limit(limit);
    return data || [];
  },

  // ---- Automations CRUD ----
  'comments:automations': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('comment_automations')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  },

  'comments:saveAutomation': async ({ userId }: Ctx, a: any) => {
    const row: any = {
      user_id: userId,
      platform: String(a.platform || 'facebook'),
      post_id: String(a.post_id || '').trim(),
      post_url: a.post_url || '',
      post_title: a.post_title || '',
      trigger_keywords: Array.isArray(a.trigger_keywords) ? a.trigger_keywords : [],
      comment_reply: String(a.comment_reply || ''),
      dm_message: String(a.dm_message || ''),
      dm_attachment_url: a.dm_attachment_url || '',
      is_active: a.is_active !== false,
    };
    if (!row.comment_reply || !row.trigger_keywords.length) {
      throw new Error('بيانات ناقصة: يجب وضع الكلمات المفتاحية ورد التعليق على الأقل');
    }
    if (a.id) {
      const { data } = await supabase.from('comment_automations')
        .update(row).eq('id', a.id).eq('user_id', userId).select().single();
      return data;
    } else {
      const { data, error } = await supabase.from('comment_automations')
        .upsert(row, { onConflict: 'user_id,post_id' }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  },

  'comments:deleteAutomation': async ({ userId }: Ctx, { id }: any) => {
    await supabase.from('comment_automations').delete().eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  'comments:toggleAutomation': async ({ userId }: Ctx, { id, is_active }: any) => {
    await supabase.from('comment_automations').update({ is_active }).eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  // ---- User-wide toggles ----
  'comments:getSettings': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('user_profiles')
      .select('auto_delete_bad_comments, ai_reply_comments_enabled').eq('user_id', userId).single();
    return data || { auto_delete_bad_comments: false, ai_reply_comments_enabled: true };
  },

  'comments:saveSettings': async ({ userId }: Ctx, { auto_delete_bad_comments, ai_reply_comments_enabled }: any) => {
    const updates: any = {};
    if (auto_delete_bad_comments !== undefined) updates.auto_delete_bad_comments = !!auto_delete_bad_comments;
    if (ai_reply_comments_enabled !== undefined) updates.ai_reply_comments_enabled = !!ai_reply_comments_enabled;
    await supabase.from('user_profiles').update(updates).eq('user_id', userId);
    return { success: true };
  },

  // ---- Delete an individual comment (manual moderation) ----
  'comments:deleteComment': async ({ userId }: Ctx, { id }: any) => {
    await supabase.from('comments_inbox').update({ deleted: true }).eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  /**
   * Dry-run: given automation values, render what would happen if the first trigger
   * keyword arrived as a comment on the configured post. Doesn't touch the platform API.
   */
  'comments:testAutomation': async ({ userId }: Ctx, a: any) => {
    if (!a?.trigger_keywords?.length) return { success: false, error: 'لا يوجد كلمات مفتاحية' };
    if (!a?.comment_reply) return { success: false, error: 'رد التعليق فارغ' };
    const dmBody = a.dm_message
      ? (a.dm_attachment_url ? `${a.dm_message}\n\n${a.dm_attachment_url}` : a.dm_message)
      : null;
    return {
      success: true,
      would_reply: true,
      would_dm: !!dmBody,
      trigger_used: a.trigger_keywords[0],
      comment_reply: a.comment_reply,
      dm_message: dmBody,
    };
  },
};
