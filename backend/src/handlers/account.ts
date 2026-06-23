import crypto from 'crypto';
import { supabase } from '../supabase';
import { Ctx } from '../rpc';
import { nashir } from './nashir';

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

  await supabase.from('user_profiles').insert({ user_id: userId, email, full_name: fullName, nashir_webhook_token: crypto.randomUUID() });
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
    // Try the new-schema select; fall back if telegram_bot_token column doesn't exist yet.
    let { data: profile, error } = await supabase.from('user_profiles')
      .select('user_id, email, full_name, subscription_status, subscription_expires_at, plan, is_admin, ai_model, nashir_account_ids, telegram_bot_token, store_id:user_id')
      .eq('user_id', userId).single();
    if (error) {
      const fallback = await supabase.from('user_profiles')
        .select('user_id, email, full_name, subscription_status, subscription_expires_at, plan, is_admin, ai_model, nashir_account_ids, store_id:user_id')
        .eq('user_id', userId).single();
      profile = fallback.data as any;
    }

    if (profile?.subscription_status === 'active' && profile.subscription_expires_at) {
      if (new Date(profile.subscription_expires_at) < new Date()) {
        await supabase.from('user_profiles').update({ subscription_status: 'expired' }).eq('user_id', userId);
        return { ...profile, subscription_status: 'expired' };
      }
    }
    return profile;
  },

  'activation:activate': async ({ userId }: Ctx, { code }: any) => {
    // Keep original case — codes mix upper+lower letters and symbols.
    const clean = String(code || '').trim();
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
    // 20-char activation codes mixing upper/lower letters, digits, and url-safe symbols.
    const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    const makeCode = () => {
      const bytes = crypto.randomBytes(20);
      let out = '';
      for (let i = 0; i < 20; i++) out += ALPHA[bytes[i] % ALPHA.length];
      return out;
    };
    const codes = Array.from({ length: Math.min(Number(count) || 1, 50) }, makeCode);
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
    const users = data || [];
    // Backfill webhook tokens for any user created before this column existed.
    for (const u of users) {
      if (!u.nashir_webhook_token) {
        const token = crypto.randomUUID();
        await supabase.from('user_profiles').update({ nashir_webhook_token: token }).eq('user_id', u.user_id);
        u.nashir_webhook_token = token;
      }
    }
    return users;
  },
  'admin:updateUser': async ({ userId }: Ctx, { target_user_id, ai_model, ai_provider, subscription_status, is_admin, nashir_account_ids, nashir_business_id, telegram_bot_token, plan, subscription_expires_at }: any) => {
    await requireAdmin(userId);
    const updates: Record<string, unknown> = {};
    if (ai_model !== undefined) updates.ai_model = ai_model;
    if (ai_provider !== undefined) updates.ai_provider = ai_provider || null;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    if (nashir_account_ids !== undefined) {
      updates.nashir_account_ids = Array.isArray(nashir_account_ids)
        ? nashir_account_ids.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
    }
    if (nashir_business_id !== undefined) updates.nashir_business_id = String(nashir_business_id || '');
    if (telegram_bot_token !== undefined) updates.telegram_bot_token = String(telegram_bot_token || '');
    if (plan !== undefined) updates.plan = String(plan || 'basic');
    if (subscription_expires_at !== undefined) updates.subscription_expires_at = subscription_expires_at || null;
    const { data } = await supabase.from('user_profiles').update(updates).eq('user_id', target_user_id).select().single();
    return data;
  },

  // Owner's Nashir connected accounts — used in the admin panel to assign pages to a client.
  'admin:nashirAccounts': async ({ userId }: Ctx) => {
    await requireAdmin(userId);
    const key = process.env.NASHIR_API_KEY || '';
    if (!key) return [];
    try { return await nashir.accounts(key); } catch { return []; }
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
