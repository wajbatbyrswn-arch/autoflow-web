import cron from 'node-cron';
import { supabase } from '../supabase';
import { nashir, nashirKey } from '../handlers/nashir';
import { processInbound } from '../handlers/inbound';
import { processInboundComment } from '../handlers/comments';

async function pollUser(user: any) {
  const key = await nashirKey(user.user_id);
  if (!key) return;

  // Owner-managed separation: only poll the Nashir page IDs assigned to this user.
  // If none assigned (single-tenant / test), poll the whole team unscoped.
  let accountIds: (string | undefined)[] = [undefined];
  const raw = user.nashir_account_ids;
  if (Array.isArray(raw) && raw.length) accountIds = raw.map((x: any) => String(x));

  try {
    for (const acc of accountIds) {
      // DMs → processInbound: has ORDER_CONTRACT, order saving, complaint detection, dedup on messages table.
      for (const m of await nashir.unreadMessages(key, acc))
        await processInbound(user.user_id, m).catch(e => console.error('[poller dm]', e?.message || e));

      // Comments → processInboundComment: has automation matching + AI fallback, dedup on comments_inbox table.
      for (const c of await nashir.unreadComments(key, acc))
        await processInboundComment(user.user_id, c).catch(e => console.error('[poller comment]', e?.message || e));
    }
  } catch (e: any) {
    console.error(`[poller user ${user.user_id}]`, e?.message || e);
  }
}

export function startPoller() {
  cron.schedule('*/2 * * * *', async () => {
    const { data: users } = await supabase.from('user_profiles').select('user_id, nashir_account_ids').eq('subscription_status', 'active');
    for (const u of users || []) await pollUser(u).catch(console.error);
  });
  console.log('Nashir poller started (every 2 min)');
}
