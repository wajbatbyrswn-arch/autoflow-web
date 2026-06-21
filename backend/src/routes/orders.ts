import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase.service';

const router = Router();

// GET /api/orders?user_id=&status=
router.get('/', async (req: Request, res: Response) => {
  const { user_id, status } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  let query = supabase
    .from('orders')
    .select('*, products(name, price, currency)')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/orders
router.post('/', async (req: Request, res: Response) => {
  const { user_id, conversation_id, customer_name, product_id, product_name, quantity, total_price, notes } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const { data, error } = await supabase
    .from('orders')
    .insert({ user_id, conversation_id, customer_name, product_id, product_name, quantity: quantity || 1, total_price, notes })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
