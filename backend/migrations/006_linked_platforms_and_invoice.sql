-- Per-user record of which platforms admin assigned (so status shows immediately,
-- without waiting for first traffic to arrive).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS nashir_linked_platforms TEXT[];

-- Invoice customization fields, persisted per store so prefs survive across orders.
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS invoice_address TEXT;
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS invoice_social JSONB;
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS invoice_brand_color TEXT;
