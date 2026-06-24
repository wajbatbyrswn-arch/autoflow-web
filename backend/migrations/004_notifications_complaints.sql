-- Per-conversation AI pause window (for complaints + manual takeover).
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ;

-- Per-user notifications feed (orders, complaints, system).
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  conversation_id BIGINT,
  meta JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(user_id, type, created_at DESC);

-- Admin's Telegram chat id (where notifications get pushed via their bot).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS admin_telegram_chat_id TEXT;
