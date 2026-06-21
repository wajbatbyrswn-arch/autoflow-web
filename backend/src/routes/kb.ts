import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase.service';

const router = Router();

// GET /api/kb?user_id=
router.get('/', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/kb
router.post('/', async (req: Request, res: Response) => {
  const { user_id, name, description, price, currency, stock_status, category } = req.body;
  if (!user_id || !name) return res.status(400).json({ error: 'user_id and name required' });

  const { data, error } = await supabase
    .from('products')
    .insert({ user_id, name, description, price, currency: currency || 'JOD', stock_status: stock_status || 'available', category })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PUT /api/kb/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, currency, stock_status, category } = req.body;

  const { data, error } = await supabase
    .from('products')
    .update({ name, description, price, currency, stock_status, category })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/kb/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

export default router;
