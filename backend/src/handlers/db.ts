import { supabase } from '../supabase';
import { Ctx } from '../rpc';

export const dbHandlers = {
  // ---- Products ----
  'db:getProducts': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('products').select('*').eq('user_id', userId).order('id', { ascending: false });
    return data || [];
  },
  'db:saveProduct': async ({ userId }: Ctx, p: any) => {
    const row = {
      user_id: userId, sku: p.sku || '', name: p.name, description: p.description || '',
      price: p.price || 0, quantity: p.quantity || 0, sizes: p.sizes || '',
      image_url: p.image_url || '', category: p.category || '', notes: p.notes || '',
      custom_fields: p.custom_fields || {},
      updated_at: new Date().toISOString(),
    };
    if (p.id) {
      await supabase.from('products').update(row).eq('id', p.id).eq('user_id', userId);
      return { success: true, id: p.id };
    }
    const { data } = await supabase.from('products').insert(row).select('id').single();
    return { success: true, id: data?.id };
  },
  'db:deleteProduct': async ({ userId }: Ctx, id: any) => {
    await supabase.from('products').delete().eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  // ---- Orders ----
  'db:getOrders': async ({ userId }: Ctx, filters: any = {}) => {
    let q = supabase.from('orders').select('*').eq('user_id', userId);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.platform) q = q.eq('platform', filters.platform);
    const { data } = await q.order('created_at', { ascending: false });
    return data || [];
  },
  'db:saveOrder': async ({ userId }: Ctx, o: any) => {
    const orderNum = 'ORD-' + Date.now();
    const { data } = await supabase.from('orders').insert({
      user_id: userId, order_number: orderNum, customer_name: o.customer_name || '',
      customer_phone: o.customer_phone || '', customer_city: o.customer_city || '',
      customer_area: o.customer_area || '', customer_map_link: o.customer_map_link || '',
      customer_notes: o.customer_notes || '', products_json: JSON.stringify(o.products || []),
      total_amount: o.total_amount || 0, platform: o.platform || '',
      conversation_id: o.conversation_id || '', status: 'new',
    }).select('id').single();
    return { success: true, id: data?.id, order_number: orderNum };
  },
  'db:updateOrderStatus': async ({ userId }: Ctx, { id, status }: any) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  // ---- Conversations & messages ----
  'db:getConversations': async ({ userId }: Ctx, filters: any = {}) => {
    let q = supabase.from('conversations').select('*').eq('user_id', userId);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.platform) q = q.eq('platform', filters.platform);
    const { data } = await q.order('last_message_at', { ascending: false });
    return data || [];
  },
  'db:getMessages': async ({ userId }: Ctx, convId: any) => {
    const { data } = await supabase.from('messages').select('*').eq('user_id', userId).eq('conversation_id', convId).order('created_at', { ascending: true });
    return data || [];
  },

  // ---- Stats (dashboard) ----
  'db:getStats': async ({ userId }: Ctx) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

    const count = async (table: string, build?: (q: any) => any) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (build) q = build(q);
      const { count } = await q;
      return count || 0;
    };

    const { data: orders30 } = await supabase.from('orders').select('total_amount,status,platform,products_json,created_at').eq('user_id', userId).gte('created_at', since30);
    const all = orders30 || [];
    const notCancelled = all.filter(o => o.status !== 'cancelled');
    const isToday = (d: string) => new Date(d) >= today;

    const byDayMap: Record<string, { count: number; revenue: number }> = {};
    for (const o of all) {
      const day = (o.created_at || '').slice(0, 10);
      if (!byDayMap[day]) byDayMap[day] = { count: 0, revenue: 0 };
      byDayMap[day].count++;
      if (o.status !== 'cancelled') byDayMap[day].revenue += o.total_amount || 0;
    }
    const platformMap: Record<string, number> = {};
    for (const o of all) platformMap[o.platform || ''] = (platformMap[o.platform || ''] || 0) + 1;

    return {
      messages_today: await count('messages', q => q.gte('created_at', todayIso)),
      orders_today: all.filter(o => isToday(o.created_at)).length,
      orders_total: await count('orders'),
      comments_today: await count('activity_log', q => q.gte('created_at', todayIso)),
      active_conversations: await count('conversations', q => q.eq('status', 'active')),
      revenue_today: notCancelled.filter(o => isToday(o.created_at)).reduce((s, o) => s + (o.total_amount || 0), 0),
      revenue_total: notCancelled.reduce((s, o) => s + (o.total_amount || 0), 0),
      orders_by_day: Object.entries(byDayMap).map(([day, v]) => ({ day, count: v.count, revenue: v.revenue })).sort((a, b) => a.day.localeCompare(b.day)),
      platform_distribution: Object.entries(platformMap).map(([platform, count]) => ({ platform, count })),
      top_products: notCancelled.map(o => ({ products_json: o.products_json })),
    };
  },

  // ---- Campaigns ----
  'db:getCampaigns': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('campaigns').select('*').eq('user_id', userId).order('id', { ascending: false });
    return data || [];
  },
  'db:saveCampaign': async ({ userId }: Ctx, c: any) => {
    const row = {
      user_id: userId, name: c.name, platform: c.platform || 'facebook', post_url: c.post_url || '',
      target: c.target || 'all', trigger_type: c.trigger_type || 'keyword', trigger_value: c.trigger_value || '',
      reply_type: c.reply_type || 'text', reply_text: c.reply_text || '', dm_enabled: c.dm_enabled ? 1 : 0,
      dm_text: c.dm_text || '', dm_files: c.dm_files || '', require_follow: c.require_follow ? 1 : 0,
      is_active: c.is_active ? 1 : 0,
    };
    if (c.id) { await supabase.from('campaigns').update(row).eq('id', c.id).eq('user_id', userId); }
    else { await supabase.from('campaigns').insert(row); }
    return { success: true };
  },
  'db:deleteCampaign': async ({ userId }: Ctx, id: any) => {
    await supabase.from('campaigns').delete().eq('id', id).eq('user_id', userId);
    return { success: true };
  },

  'db:getActivityLog': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200);
    return data || [];
  },

  // ---- Store config ----
  'db:getStoreConfig': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('store_config').select('*').eq('user_id', userId).single();
    return data || {};
  },
  'db:saveStoreConfig': async ({ userId }: Ctx, c: any) => {
    await supabase.from('store_config').upsert({
      user_id: userId, store_name: c.store_name || '', store_description: c.store_description || '',
      language: c.language || 'ar', work_hours: c.work_hours || '', ai_personality: c.ai_personality || 'friendly',
      currency: c.currency || 'JOD', contact_phone: c.contact_phone || '', system_prompt: c.system_prompt || '',
      store_logo: c.store_logo || '',
      ...(c.product_fields !== undefined ? { product_fields: c.product_fields } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    return { success: true };
  },

  // ---- Brand themes ----
  'db:getBrandThemes': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('brand_themes').select('*').eq('user_id', userId).order('id', { ascending: false });
    return data || [];
  },
  'db:saveBrandTheme': async ({ userId }: Ctx, t: any) => {
    const row = {
      user_id: userId, name: t.name, primary_color: t.primary_color || '#6C47FF', secondary_color: t.secondary_color || '#FF6B6B',
      background_color: t.background_color || '#FFFFFF', text_color: t.text_color || '#1A1A1A', logo_url: t.logo_url || '',
      font_style: t.font_style || 'modern', frame_style: t.frame_style || 'none', price_position: t.price_position || 'top-right',
      logo_position: t.logo_position || 'top-left', aspect_ratio: t.aspect_ratio || '1:1', dialect: t.dialect || 'formal',
      contact_link: t.contact_link || '', brand_description: t.brand_description || '', ai_style_notes: t.ai_style_notes || '',
      updated_at: new Date().toISOString(),
    };
    if (t.id) { await supabase.from('brand_themes').update(row).eq('id', t.id).eq('user_id', userId); return { success: true, id: t.id }; }
    const { data } = await supabase.from('brand_themes').insert(row).select('id').single();
    return { success: true, id: data?.id };
  },

  // ---- Generated posts ----
  'db:getGeneratedPosts': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('generated_posts').select('*').eq('user_id', userId).order('id', { ascending: false });
    return data || [];
  },
  'db:saveGeneratedPost': async ({ userId }: Ctx, p: any) => {
    const { data } = await supabase.from('generated_posts').insert({
      user_id: userId, brand_theme_id: p.brand_theme_id || null, product_name: p.product_name || '',
      product_price: p.product_price || '', product_original_price: p.product_original_price || '',
      product_description: p.product_description || '', product_image_url: p.product_image_url || '',
      generated_image_url: p.generated_image_url || '', post_text: p.post_text || '',
      hashtags: JSON.stringify(p.hashtags || []), platform: p.platform || '', tone: p.tone || '',
    }).select('id').single();
    return { success: true, id: data?.id };
  },
  'db:deleteGeneratedPost': async ({ userId }: Ctx, id: any) => {
    await supabase.from('generated_posts').delete().eq('id', id).eq('user_id', userId);
    return { success: true };
  },
};
