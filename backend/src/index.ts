import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verifyToken, getBearer } from './auth';
import { registerAll, dispatch } from './rpc';
import { addClient } from './events';
import { startPoller } from './jobs/poller';
import { supabase } from './supabase';
import { handleNashirWebhook } from './handlers/inbound';

import { dbHandlers } from './handlers/db';
import { aiHandlers } from './handlers/ai';
import { settingsHandlers } from './handlers/settings';
import { accountHandlers } from './handlers/account';
import { nashirHandlers } from './handlers/nashir';
import { stubHandlers } from './handlers/stubs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Register every channel (mirrors Electron IPC handlers).
registerAll({
  ...dbHandlers,
  ...aiHandlers,
  ...settingsHandlers,
  ...accountHandlers,
  ...nashirHandlers,
  ...stubHandlers,
});

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Per-user Nashir webhook: paste this URL (with the user's token) into Nashir's workflow.
// Public endpoint — identified by the secret token in the path.
app.all('/api/nashir/webhook/:token', async (req, res) => {
  const token = req.params.token;
  const { data: user } = await supabase
    .from('user_profiles').select('user_id').eq('nashir_webhook_token', token).single();
  if (!user) return res.status(404).json({ error: 'unknown webhook token' });
  // Acknowledge immediately so Nashir doesn't retry/timeout; process in background.
  res.json({ ok: true });
  if (req.method === 'POST' && req.body) {
    handleNashirWebhook(user.user_id, req.body).catch((e) => console.error('[nashir webhook]', e?.message || e));
  }
});

// Single RPC endpoint: { channel, payload } -> { result }
app.post('/api/rpc', async (req, res) => {
  const userId = await verifyToken(getBearer(req.headers.authorization) || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { channel, payload } = req.body || {};
  try {
    const result = await dispatch(channel, { userId }, payload);
    return res.json({ result });
  } catch (err: any) {
    console.error(`[RPC ${channel}]`, err?.message || err);
    return res.status(400).json({ error: err?.message || 'error' });
  }
});

// SSE event stream (token passed as query param since EventSource can't set headers).
app.get('/api/events', async (req, res) => {
  const userId = await verifyToken(String(req.query.token || ''));
  if (!userId) return res.status(401).end();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 5000\n\n');
  addClient(userId, res);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
  res.on('close', () => clearInterval(ping));
});

// Never let a background error (e.g. Nashir/Gemini 429) crash the server.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', (reason as any)?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.message || err);
});

app.listen(PORT, () => {
  console.log(`AutoFlow API running on port ${PORT}`);
  // Poller is opt-in (set ENABLE_POLLER=1). Disabled by default — ingestion will
  // move to the Nashir webhook, and the broad poll was exhausting the Gemini quota.
  if (process.env.ENABLE_POLLER === '1') startPoller();
});
