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
import { notificationsHandlers } from './handlers/notifications';
import { commentsHandlers } from './handlers/comments';
import { stubHandlers } from './handlers/stubs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));

// Webhook route: accept ANY content-type (text/plain, missing header, form-encoded...).
// Nashir/proxies may not send application/json — express.json() alone would leave
// req.body EMPTY and we'd return 200 ok without processing (silent message drop!).
// Must be registered BEFORE express.json so it wins for this path.
app.use('/api/nashir/webhook', express.text({ type: '*/*', limit: '15mb' }), (req, _res, next) => {
  if (typeof req.body === 'string') {
    const raw = req.body.trim();
    req.body = undefined as any;
    if (raw) {
      try { req.body = JSON.parse(raw); }
      catch {
        // Fallback: form-encoded (key=value&...)
        try {
          const params = Object.fromEntries(new URLSearchParams(raw));
          if (Object.keys(params).length) req.body = params;
        } catch {}
        if (!req.body) console.warn('[nashir webhook] unparseable body:', req.headers['content-type'], raw.slice(0, 300));
      }
    }
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

// Register every channel (mirrors Electron IPC handlers).
registerAll({
  ...dbHandlers,
  ...aiHandlers,
  ...settingsHandlers,
  ...accountHandlers,
  ...nashirHandlers,
  ...notificationsHandlers,
  ...commentsHandlers,
  ...stubHandlers,
});

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 🔬 Diagnostic ring buffer: keeps the last 30 webhook calls per token in memory.
// Used to inspect exactly what Nashir sends when messages fail to arrive.
const WEBHOOK_TRACE: Array<{
  at: string;
  token: string;
  method: string;
  contentType: string;
  bodyPreview: any;
  processedItems: number;
  reply: string;
  error: string | null;
}> = [];
function pushTrace(entry: typeof WEBHOOK_TRACE[number]) {
  WEBHOOK_TRACE.unshift(entry);
  if (WEBHOOK_TRACE.length > 30) WEBHOOK_TRACE.length = 30;
}

// Public trace endpoint: pass the same webhook token to see the last 30 calls that hit it.
// Safe because token is a per-user secret UUID.
app.get('/api/nashir/webhook-trace/:token', async (req, res) => {
  const token = req.params.token;
  const { data: user } = await supabase
    .from('user_profiles').select('user_id').eq('nashir_webhook_token', token).single();
  if (!user) return res.status(404).json({ error: 'unknown token' });
  const entries = WEBHOOK_TRACE.filter(e => e.token === token);
  return res.json({ count: entries.length, entries });
});

// Per-user Nashir webhook: paste this URL (with the user's token) into Nashir's workflow.
// Public endpoint — identified by the secret token in the path.
app.all('/api/nashir/webhook/:token', async (req, res) => {
  const token = req.params.token;
  const trace = {
    at: new Date().toISOString(),
    token,
    method: req.method,
    contentType: String(req.headers['content-type'] || ''),
    bodyPreview: req.body ? JSON.parse(JSON.stringify(req.body)) : null,
    processedItems: 0,
    reply: '',
    error: null as string | null,
  };
  const { data: user } = await supabase
    .from('user_profiles').select('user_id').eq('nashir_webhook_token', token).single();
  if (!user) {
    trace.error = 'unknown token';
    pushTrace(trace);
    return res.status(404).json({ error: 'unknown webhook token' });
  }
  if (req.method !== 'POST' || !req.body) {
    trace.error = 'no body or non-POST';
    pushTrace(trace);
    return res.json({ ok: true });
  }
  try {
    // Nashir's chatbot custom-webhook expects the reply in the HTTP response body.
    const { reply, replies } = await handleNashirWebhook(user.user_id, req.body);
    trace.reply = reply || '';
    trace.processedItems = replies?.length || 0;
    pushTrace(trace);
    return res.json({ reply, replies, response: reply, text: reply, ok: true });
  } catch (e: any) {
    trace.error = e?.message || String(e);
    pushTrace(trace);
    console.error('[nashir webhook]', e?.message || e);
    return res.json({ ok: true });
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
