-- Store the full raw webhook payload Nashir delivers, so the user can audit
-- exactly what arrived (including attachments, payload, contact, etc.) when
-- the visible content seems off (e.g. Meta replaced phone with "[phone]").
ALTER TABLE messages ADD COLUMN IF NOT EXISTS raw_payload jsonb;
