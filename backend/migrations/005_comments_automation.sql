-- Per-post comment automation (mention-bait flow like ManyChat).
CREATE TABLE IF NOT EXISTS comment_automations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,           -- 'facebook' | 'instagram'
  post_id TEXT NOT NULL,            -- the FB/IG post id
  post_url TEXT,
  post_title TEXT,
  trigger_keywords TEXT[] NOT NULL, -- e.g. ['تفاصيل','معلومات']  (match if any contained)
  comment_reply TEXT NOT NULL,      -- public reply to the commenter
  dm_message TEXT NOT NULL,         -- direct message body sent to the commenter
  dm_attachment_url TEXT,           -- optional file/image link added to the DM
  is_active BOOLEAN DEFAULT TRUE,
  triggered_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_autom_user_active ON comment_automations(user_id, is_active);

-- Track comments received (so we can show them in the UI + dedupe responses).
CREATE TABLE IF NOT EXISTS comments_inbox (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  post_id TEXT,
  post_title TEXT,
  comment_id TEXT UNIQUE,           -- the actual Nashir/platform comment id
  commenter_name TEXT,
  commenter_id TEXT,
  content TEXT,
  ai_replied BOOLEAN DEFAULT FALSE,
  automation_triggered BIGINT,      -- comment_automations.id if matched
  deleted BOOLEAN DEFAULT FALSE,
  is_negative BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_inbox_user_created ON comments_inbox(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_inbox_post ON comments_inbox(user_id, post_id);

-- Per-user toggle: auto-delete negative/abusive comments via AI judgement.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auto_delete_bad_comments BOOLEAN DEFAULT FALSE;
-- Per-user toggle: enable AI auto-reply to comments (skipped on posts with a comment_automation).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ai_reply_comments_enabled BOOLEAN DEFAULT TRUE;
