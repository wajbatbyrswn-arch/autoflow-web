import cron from 'node-cron';
import { supabase } from '../services/supabase.service';
import { getUnreadMessages, getUnreadComments, replyToMessage, replyToComment, markMessageRead } from '../services/nashir.service';
import { processMessage } from '../services/ai.service';

async function processUserMessages(user: {
  user_id: string;
  nashir_api_key: string;
  ai_model: string;
  ai_mode: string;
  store_name: string;
  store_description: string;
  custom_system_prompt?: string;
}) {
  const { data: products } = await supabase
    .from('products')
    .select('name, price, currency, stock_status, description')
    .eq('user_id', user.user_id);

  async function handleItem(
    item: Record<string, unknown>,
    isComment: boolean
  ) {
    const nashirId = String(item.id);
    const table = 'messages';

    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('nashir_message_id', nashirId)
      .single();

    if (existing) return;

    const platform = isComment
      ? `${item.platform}_comment`
      : String(item.platform);
    const customerId = String(item.sender_id);
    const customerName = String(item.sender_name || 'عميل');
    const content = String(item.message || '');

    let { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('customer_platform_id', customerId)
      .eq('platform', platform)
      .single();

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user_id: user.user_id,
          platform,
          customer_name: customerName,
          customer_platform_id: customerId,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      conv = newConv;
    } else {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conv!.id);
    }

    const aiResult = await processMessage(
      content,
      user.store_name || 'المتجر',
      user.store_description || '',
      products || [],
      user.ai_model,
      user.custom_system_prompt
    );

    await supabase.from('conversations').update({ ai_tag: aiResult.tag }).eq('id', conv!.id);

    await supabase.from(table).insert({
      conversation_id: conv!.id,
      nashir_message_id: nashirId,
      content,
      is_from_customer: true,
      ai_suggestion: aiResult.reply,
      is_read: false,
      sent_at: new Date().toISOString(),
    });

    if (user.ai_mode === 'autopilot') {
      const numericId = Number(item.id);
      if (isComment) {
        await replyToComment(user.nashir_api_key, numericId, aiResult.reply);
      } else {
        await replyToMessage(user.nashir_api_key, numericId, aiResult.reply);
      }
      await markMessageRead(user.nashir_api_key, numericId);

      await supabase.from(table).insert({
        conversation_id: conv!.id,
        nashir_message_id: `reply_${nashirId}`,
        content: aiResult.reply,
        is_from_customer: false,
        is_read: true,
        sent_at: new Date().toISOString(),
      });

      if (aiResult.tag === 'order_request') {
        await supabase.from('orders').insert({
          user_id: user.user_id,
          conversation_id: conv!.id,
          customer_name: customerName,
          status: 'pending',
        });
      }
    }
  }

  try {
    const dmsRes = await getUnreadMessages(user.nashir_api_key) as { data?: Record<string, unknown>[] };
    for (const msg of dmsRes.data || []) {
      await handleItem(msg, false).catch(console.error);
    }

    const commentsRes = await getUnreadComments(user.nashir_api_key) as { data?: Record<string, unknown>[] };
    for (const comment of commentsRes.data || []) {
      await handleItem(comment, true).catch(console.error);
    }
  } catch (err) {
    console.error(`Polling error for user ${user.user_id}:`, err);
  }
}

export function startPollingJob() {
  cron.schedule('*/2 * * * *', async () => {
    const { data: activeUsers } = await supabase
      .from('user_profiles')
      .select('user_id, nashir_api_key, ai_model, ai_mode, store_name, store_description, custom_system_prompt')
      .eq('subscription_status', 'active')
      .not('nashir_api_key', 'is', null);

    if (!activeUsers?.length) return;

    for (const user of activeUsers) {
      await processUserMessages(user).catch(console.error);
    }
  });

  console.log('Message polling job started (every 2 minutes)');
}
