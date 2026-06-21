import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase.service';
import crypto from 'crypto';

const router = Router();

// Middleware: verify admin
async function requireAdmin(req: Request, res: Response, next: Function) {
  const { user_id } = req.query as { user_id?: string } || req.body;
  if (!user_id) return res.status(401).json({ error: 'user_id required' });

  const { data } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user_id)
    .single();

  if (!data?.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// POST /api/admin/codes/generate
router.post('/codes/generate', requireAdmin, async (req: Request, res: Response) => {
  const { duration_days = 30, count = 1 } = req.body;

  const codes = Array.from({ length: Number(count) }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  const { data, error } = await supabase
    .from('activation_codes')
    .insert(codes.map(code => ({ code, duration_days })))
    .select();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// GET /api/admin/codes?user_id=
router.get('/codes', requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('activation_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/admin/users?user_id=
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, auth_users:user_id(email)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /api/admin/users/:target_user_id
router.patch('/users/:target_user_id', requireAdmin, async (req: Request, res: Response) => {
  const { target_user_id } = req.params;
  const { ai_model, subscription_status, is_admin } = req.body;

  const updates: Record<string, unknown> = {};
  if (ai_model !== undefined) updates.ai_model = ai_model;
  if (subscription_status !== undefined) updates.subscription_status = subscription_status;
  if (is_admin !== undefined) updates.is_admin = is_admin;

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', target_user_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
