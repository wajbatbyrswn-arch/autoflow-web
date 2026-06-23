-- Add per-user telegram bot token (admin sets this for clients who can't make their own bot).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
