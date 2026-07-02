import cron from 'node-cron';
import { supabase } from '../supabase';
import { nashir, nashirKey } from '../handlers/nashir';
import { processInbound } from '../handlers/inbound';
import { processInboundComment } from '../handlers/comments';

// Nashir has NO webhook for incoming DMs (their webhooks only fire on post.published).
// Their official auto-reply pattern is polling GET /messages?is_read=false — this poller
// is therefore the PRIMARY ingestion path, not a fallback.

// Only AI-reply to messages newer than this; older backlog is stored silently.
const FRESH_WINDOW_MS = 24 * 3600 * 1000;
// Gemini quota guard: max AI replies per user per cycle.
const MAX_AI_REPLIES_PER_CYCLE = 10;

let running = false;

async function pollUser(user: any) {
  // Multi-tenant safety: a user with no assigned pages AND no personal key must never
  // poll unscoped — they would ingest (and answer!) every other client's messages
  // through the owner fallback key.
  const key = await nashirKey(user.user_id);
  if (!key) return;
  const { data: prof } = await supabase.from('user_profiles')
    .select('nashir_api_key').eq('user_id', user.user_id).single();
  const hasOwnKey = !!(prof?.nashir_api_key && prof.nashir_api_key.trim());
  const assigned: string[] = Array.isArray(user.nashir_account_ids)
    ? user.nashir_account_ids.map((x: any) => String(x).trim()).filter(Boolean)
    : [];
  if (!assigned.length && !hasOwnKey) return;

  const accountIds: (string | undefined)[] = assigned.length ? assigned : [undefined];
  let aiBudget = MAX_AI_REPLIES_PER_CYCLE;

  for (const acc of accountIds) {
    // ---- DMs ----
    let msgs: any[] = [];
    try { msgs = await nashir.unreadMessages(key, acc); }
    catch (e: any) { console.error('[poller dm fetch]', e?.message || e); continue; }

    // Nashir stores OUR OWN outbound replies in the same inbox, flagged is_our_reply.
    // We must not AI-reply to them — but we MUST mark them read, otherwise they sit in
    // the unread list forever and every cycle refetches the same backlog (they never drain).
    const ownReplies = msgs.filter((m: any) => m.is_our_reply);
    for (const m of ownReplies) {
      try { await nashir.markRead(key, m.id); }
      catch (e: any) { console.error('[poller markRead own]', m.id, e?.message || e); }
    }
    msgs = msgs.filter((m: any) => !m.is_our_reply);
    // Oldest → newest so conversation history builds in order.
    msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    // Only the NEWEST message per sender deserves an AI reply — replying to each of
    // 5 stacked "هلا" messages would send 5 replies to the same person.
    const newestPerSender = new Map<string, any>();
    for (const m of msgs) newestPerSender.set(String(m.sender_id), m.id);

    for (const m of msgs) {
      const isNewest = newestPerSender.get(String(m.sender_id)) === m.id;
      const fresh = Date.now() - new Date(m.created_at).getTime() < FRESH_WINDOW_MS;
      const wantAI = isNewest && fresh && aiBudget > 0;
      try {
        const reply = await processInbound(user.user_id, m, { skipAI: !wantAI });
        if (wantAI && reply) aiBudget--;
      } catch (e: any) { console.error('[poller dm]', e?.message || e); }
      // Always mark read — even deduped/skipped — so the unread backlog drains
      // and we stop refetching the same messages forever.
      try { await nashir.markRead(key, m.id); }
      catch (e: any) { console.error('[poller markRead]', m.id, e?.message || e); }
    }

    // ---- Comments ----
    // comments_inbox has its own hard dedup (early-return on comment_id), and Nashir has
    // no mark-read endpoint for comments — so we just process; dedup keeps it idempotent.
    try {
      let comments = await nashir.unreadComments(key, acc);
      comments = comments.filter((c: any) => !c.is_our_reply);
      for (const c of comments) {
        try { await processInboundComment(user.user_id, c); }
        catch (e: any) { console.error('[poller comment]', e?.message || e); }
      }
    } catch (e: any) { console.error('[poller comments fetch]', e?.message || e); }
  }
}

export function startPoller() {
  cron.schedule('* * * * *', async () => {
    if (running) return; // never overlap a slow cycle
    running = true;
    try {
      const { data: users } = await supabase.from('user_profiles')
        .select('user_id, nashir_account_ids').eq('subscription_status', 'active');
      for (const u of users || []) await pollUser(u).catch(console.error);
    } finally { running = false; }
  });
  console.log('Nashir poller started (every 1 min)');
}
