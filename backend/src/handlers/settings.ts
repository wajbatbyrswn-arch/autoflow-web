import { supabase } from '../supabase';
import { Ctx } from '../rpc';

export async function getSetting(userId: string, key: string): Promise<any> {
  const { data } = await supabase.from('app_settings').select('value').eq('user_id', userId).eq('key', key).single();
  if (!data) return null;
  try { return JSON.parse(data.value); } catch { return data.value; }
}

export async function setSetting(userId: string, key: string, value: any) {
  await supabase.from('app_settings').upsert(
    { user_id: userId, key, value: JSON.stringify(value) },
    { onConflict: 'user_id,key' }
  );
}

export const settingsHandlers = {
  'settings:get': async ({ userId }: Ctx, key: string) => getSetting(userId, key),
  'settings:set': async ({ userId }: Ctx, { key, value }: any) => { await setSetting(userId, key, value); return { success: true }; },
  'settings:getAll': async ({ userId }: Ctx) => {
    const { data } = await supabase.from('app_settings').select('key,value').eq('user_id', userId);
    const out: Record<string, any> = {};
    for (const r of data || []) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
    return out;
  },
};
