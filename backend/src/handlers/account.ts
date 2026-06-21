import crypto from 'crypto';
import { supabase } from '../supabase';
import { Ctx } from '../rpc';

/** Ensure a profile + store_config row exists for the user (first login bootstrap). */
async function ensureProfile(userId: string) {
  const { data: existing } = await supabase.from('user_profiles').select('user_id').eq('user_id', userId).single();
  if (existing) return;

  let email = '', fullName = '';
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    email = data.user?.email || '';
    fullName = (data.user?.user_metadata as any)?.full_name || '';
  } catch {}

  await supabase.from('user_profiles').insert({ user_id: userId, email, full_name: fullName });
  await supabase.from('store_config').insert({ user_id: userId, store_name: fullName || 'متجري' });
  // TODO(nashir): create a Nashir business for this user and store nashir_api_key/business_id here.
}

async function requireAdmin(userId: string) {
  const { data } = await supabase.from('user_profiles').select('is_admin').eq('user_id', userId).single();
  if (!data?.is_admin) throw new Error('Forbidden');
}

export const accountHandlers = {
  'activation:status': async ({ userId }: Ctx) => {
    await ensureProfile(userId);
    const { data: profile } = await supabase.from('user_profiles')
      .select('subscription_status, subscription_expires_at, plan, is_admin, ai_model, store_id:user_id')
      .eq('user_id', userId).single();

    if (profile?.subscription_status === 'active' && profile.subscription_expires_at) {
      if (new Date(profile.subscription_expires_at) < new Date()) {
        await supabase.from('user_profiles').update({ subscription_status: 'expired' }).eq('user_id', userId);
        return { ...profile, subscription_status: 'expired' };
      }
    }
    return profile;
  },

  'activation:activate': async ({ userId }: Ctx, { code }: any) => {
    const clean = String(code || '').trim().toUpperCase();
    const { data: ac } = await supabase.from('activation_codes').select('*').eq('code', clean).is('used_by', null).single();
    if (!ac) throw new Error('كود غير صحيح أو مستخدم مسبقاً');

    const expires = new Date();
    expires.setDate(expires.getDate() + (ac.duration_days || 30));
    await supabase.from('activation_codes').update({ used_by: userId, used_at: new Date().toISOString() }).eq('id', ac.id);
    await supabase.from('user_profiles').update({
      subscription_status: 'active', subscription_expires_at: expires.toISOString(), plan: 'basic',
    }).eq('user_id', userId);
    return { success: true, expires_at: expires.toISOString() };
  },

  // ---- Admin ----
  'admin:generateCodes': async ({ userId }: Ctx, { duration_days = 30, count = 1 }: any) => {
    await requireAdmin(userId);
    const codes = Array.from({ length: Math.min(Number(count) || 1, 50) }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
    const { data } = await supabase.from('activation_codes').insert(codes.map(code => ({ code, duration_days }))).select();
    return data;
  },
  'admin:getCodes': async ({ userId }: Ctx) => {
    await requireAdmin(userId);
    const { data } = await supabase.from('activation_codes').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  'admin:getUsers': async ({ userId }: Ctx) => {
    await requireAdmin(userId);
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  'admin:updateUser': async ({ userId }: Ctx, { target_user_id, ai_model, subscription_status, is_admin }: any) => {
    await requireAdmin(userId);
    const updates: Record<string, unknown> = {};
    if (ai_model !== undefined) updates.ai_model = ai_model;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    const { data } = await supabase.from('user_profiles').update(updates).eq('user_id', target_user_id).select().single();
    return data;
  },

  // ---- Meta accounts (connected pages) ----
  'meta:getAccounts': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('meta_accounts').select('*').eq('user_id', userId).eq('is_active', 1).order('id');
    return data || [];
  },
  'meta:saveAccount': async ({ userId }: Ctx, acc: any) => {
    if (!acc.page_id) return { success: false, error: 'page_id required' };
    await supabase.from('meta_accounts').upsert({
      user_id: userId, page_id: acc.page_id, page_name: acc.page_name || '', page_token: acc.page_token || '',
      ig_user_id: acc.ig_user_id || null, ig_username: acc.ig_username || null, platform: acc.platform || 'facebook', is_active: 1,
    }, { onConflict: 'user_id,page_id' });
    return { success: true };
  },
  'meta:removeAccount': async ({ userId }: Ctx, pageId: any) => {
    await supabase.from('meta_accounts').update({ is_active: 0 }).eq('user_id', userId).eq('page_id', pageId);
    return { success: true };
  },
};
