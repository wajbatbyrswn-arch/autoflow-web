import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase.service';

const router = Router();

// POST /api/activation/activate
router.post('/activate', async (req: Request, res: Response) => {
  const { user_id, code } = req.body;
  if (!user_id || !code) return res.status(400).json({ error: 'user_id and code required' });

  const { data: activationCode, error: codeError } = await supabase
    .from('activation_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .is('used_by', null)
    .single();

  if (codeError || !activationCode) {
    return res.status(400).json({ error: 'كود غير صحيح أو تم استخدامه مسبقاً' });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + activationCode.duration_days);

  await supabase.from('activation_codes').update({
    used_by: user_id,
    used_at: new Date().toISOString(),
  }).eq('id', activationCode.id);

  const { data: profile } = await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'active',
      subscription_expires_at: expiresAt.toISOString(),
      plan: 'basic',
    })
    .eq('user_id', user_id)
    .select()
    .single();

  return res.json({ success: true, expires_at: expiresAt.toISOString(), profile });
});

// GET /api/activation/status?user_id=
router.get('/status', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_status, subscription_expires_at, plan, is_admin')
    .eq('user_id', user_id)
    .single();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (profile.subscription_status === 'active' && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) < new Date()) {
      await supabase.from('user_profiles').update({ subscription_status: 'expired' }).eq('user_id', user_id);
      return res.json({ ...profile, subscription_status: 'expired' });
    }
  }

  return res.json(profile);
});

export default router;
