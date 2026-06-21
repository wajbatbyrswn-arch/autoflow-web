import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase.service';
import { replyToMessage, replyToComment } from '../services/nashir.service';

const router = Router();

// GET /api/inbox/conversations?user_id=
router.get('/conversations', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user_id)
    .order('last_message_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/inbox/messages?conversation_id=
router.get('/messages', async (req: Request, res: Response) => {
  const { conversation_id } = req.query;
  if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation_id)
    .order('sent_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/inbox/reply
router.post('/reply', async (req: Request, res: Response) => {
  const { user_id, conversation_id, nashir_message_id, message, is_comment } = req.body;
  if (!user_id || !conversation_id || !nashir_message_id || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('nashir_api_key')
    .eq('user_id', user_id)
    .single();

  if (!profile?.nashir_api_key) return res.status(400).json({ error: 'No Nashir API key configured' });

  const numericId = Number(nashir_message_id);

  if (is_comment) {
    await replyToComment(profile.nashir_api_key, numericId, message);
  } else {
    await replyToMessage(profile.nashir_api_key, numericId, message);
  }

  const { data: saved } = await supabase.from('messages').insert({
    conversation_id,
    nashir_message_id: `reply_${nashir_message_id}_${Date.now()}`,
    content: message,
    is_from_customer: false,
    is_read: true,
    sent_at: new Date().toISOString(),
  }).select().single();

  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id);

  return res.json(saved);
});

export default router;
