import { supabase } from '../supabase';
import { Ctx } from '../rpc';
import { nashir, nashirKey } from './nashir';
import { resolveConfig, sendToAI } from './ai';
import { createNotification } from './notifications';

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

  // Auto-delete bad: try to delete from platform via Nashir, AND mark locally
  if (isNegative && profile?.auto_delete_bad_comments && key) {
    let platformDeleted = false;
    try {
      await nashir.deleteComment(key, commentId);
      platformDeleted = true;
    } catch (e: any) {
      console.error('[auto-delete bad comment]', e?.response?.status, e?.message);
    }
    await supabase.from('comments_inbox').update({ deleted: true }).eq('comment_id', commentId);
    console.log(`[auto-delete] comment ${commentId} hidden (platform_deleted=${platformDeleted})`);
    return;
  }

  // Matched automation → public reply + (best-effort) DM
  if (matched && key) {
    // 1) Public reply
    try {
      await nashir.replyComment(key, commentId, matched.comment_reply);
    } catch (e: any) {
      console.error('[comment automation] public reply failed:', e?.response?.status, e?.message);
    }
    // 2) Try to send DM via Nashir's private-reply / DM endpoints. Nashir's free tier
    //    blocks /messages with "WhatsApp is a paid feature", and /comments/:id/private-reply
    //    is 404, so this almost always fails. We try anyway in case the user upgrades.
    if (matched.dm_message) {
      const dmBody = matched.dm_attachment_url
        ? `${matched.dm_message}\n\n${matched.dm_attachment_url}`
        : matched.dm_message;
      let dmSent = false;
      try {
        await nashir.privateReplyToComment(key, commentId, dmBody);
        console.log('[comment automation] DM sent via private reply');
        dmSent = true;
      } catch (e: any) {
        console.warn('[comment automation] DM via private reply failed:', e?.response?.status, JSON.stringify(e?.response?.data || e?.message).slice(0, 200));
      }
      // 3) Fallback: if DM couldn't be sent, post the content as a SECOND public reply
      //    so the commenter still receives the info/link/file they asked for.
      if (!dmSent) {
        try {
          await nashir.replyComment(key, commentId, dmBody);
          console.log('[comment automation] DM fallback: posted as public reply');
          // Notify the user once per automation so they know to upgrade Nashir for true DMs.
          createNotification(
            userId, 'system',
            'ℹ️ تم نشر رد التعليق كرد عام',
            `تعليق #${commentId} تم الرد عليه برسالتك (الكلمة المفتاحية: ${(matched.trigger_keywords || []).join(', ')}). لإرسال الرد كرسالة خاصة (DM) بدلاً من رد عام، قم بترقية خطة Nashir.`,
            null, { automation_id: matched.id, comment_id: commentId }
          ).catch(() => {});
        } catch (e: any) {
          console.error('[comment automation] DM fallback (public reply) failed:', e?.response?.status, e?.message);
        }
      }
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
  // Tries to delete from FB/IG via Nashir, then marks as hidden locally regardless.
  'comments:deleteComment': async ({ userId }: Ctx, { id }: any) => {
    const { data: c } = await supabase.from('comments_inbox').select('comment_id').eq('id', id).eq('user_id', userId).single();
    let platformDeleted = false;
    let platformError: string | null = null;
    if (c?.comment_id) {
      const key = await nashirKey(userId);
      if (key) {
        try {
          await nashir.deleteComment(key, c.comment_id);
          platformDeleted = true;
        } catch (e: any) {
          platformError = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'فشل الحذف من المنصة';
        }
      }
    }
    await supabase.from('comments_inbox').update({ deleted: true }).eq('id', id).eq('user_id', userId);
    return { success: true, platform_deleted: platformDeleted, platform_error: platformError };
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
