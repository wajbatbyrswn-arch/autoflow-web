-- AutoFlow Web Schema (ported from electron/handlers/db.js, multi-tenant by user_id)

-- ===== Profiles & billing =====
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT DEFAULT '',
  nashir_api_key TEXT DEFAULT '',
  nashir_business_id TEXT DEFAULT '',
  nashir_account_ids JSONB DEFAULT '[]'::jsonb,
  ai_model TEXT DEFAULT 'gemini-2.5-flash-lite',
  plan TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'inactive',
  subscription_expires_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activation_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  duration_days INTEGER DEFAULT 30,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== App data (all scoped by user_id) =====
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT DEFAULT '', name TEXT NOT NULL, description TEXT DEFAULT '',
  price REAL DEFAULT 0, quantity INTEGER DEFAULT 0, sizes TEXT DEFAULT '',
  image_url TEXT DEFAULT '', category TEXT DEFAULT '', notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT, customer_name TEXT DEFAULT '', customer_phone TEXT DEFAULT '',
  customer_city TEXT DEFAULT '', customer_area TEXT DEFAULT '', customer_map_link TEXT DEFAULT '',
  customer_notes TEXT DEFAULT '', products_json TEXT DEFAULT '[]', total_amount REAL DEFAULT 0,
  platform TEXT DEFAULT '', conversation_id TEXT DEFAULT '', status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, sender_id TEXT NOT NULL, sender_name TEXT DEFAULT '',
  sender_avatar TEXT DEFAULT '', status TEXT DEFAULT 'new', ai_enabled INTEGER DEFAULT 1,
  ai_tag TEXT, nashir_account_id TEXT,
  last_message TEXT DEFAULT '', last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  nashir_message_id TEXT, sender TEXT, content TEXT, message_type TEXT DEFAULT 'text',
  ai_suggestion TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, platform TEXT DEFAULT 'facebook', post_url TEXT DEFAULT '',
  target TEXT DEFAULT 'all', trigger_type TEXT DEFAULT 'keyword', trigger_value TEXT DEFAULT '',
  reply_type TEXT DEFAULT 'text', reply_text TEXT DEFAULT '', dm_enabled INTEGER DEFAULT 0,
  dm_text TEXT DEFAULT '', dm_files TEXT DEFAULT '', require_follow INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT, event_type TEXT, sender_name TEXT, content TEXT, reply_text TEXT,
  dm_sent INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT DEFAULT 'متجري', store_description TEXT DEFAULT '', language TEXT DEFAULT 'ar',
  work_hours TEXT DEFAULT '', ai_personality TEXT DEFAULT 'friendly', currency TEXT DEFAULT 'JOD',
  contact_phone TEXT DEFAULT '', system_prompt TEXT DEFAULT '', store_logo TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL, value TEXT,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS meta_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL, page_name TEXT DEFAULT '', page_token TEXT DEFAULT '',
  ig_user_id TEXT, ig_username TEXT, platform TEXT DEFAULT 'facebook',
  is_active INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, page_id)
);

CREATE TABLE IF NOT EXISTS brand_themes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, primary_color TEXT DEFAULT '#6C47FF', secondary_color TEXT DEFAULT '#FF6B6B',
  background_color TEXT DEFAULT '#FFFFFF', text_color TEXT DEFAULT '#1A1A1A', logo_url TEXT DEFAULT '',
  font_style TEXT DEFAULT 'modern', frame_style TEXT DEFAULT 'none', price_position TEXT DEFAULT 'top-right',
  logo_position TEXT DEFAULT 'top-left', aspect_ratio TEXT DEFAULT '1:1', dialect TEXT DEFAULT 'formal',
  contact_link TEXT DEFAULT '', brand_description TEXT DEFAULT '', ai_style_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_theme_id BIGINT REFERENCES brand_themes(id) ON DELETE SET NULL,
  product_name TEXT DEFAULT '', product_price TEXT DEFAULT '', product_original_price TEXT DEFAULT '',
  product_description TEXT DEFAULT '', product_image_url TEXT DEFAULT '', generated_image_url TEXT DEFAULT '',
  post_text TEXT DEFAULT '', hashtags TEXT DEFAULT '[]', platform TEXT DEFAULT '', tone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp/Telegram session storage (Railway FS is ephemeral)
CREATE TABLE IF NOT EXISTS channel_sessions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'whatsapp' | 'telegram'
  creds JSONB, config JSONB, status TEXT DEFAULT 'disconnected',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, channel)
);

-- ===== RLS (frontend uses backend service role; enable anyway for safety) =====
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY own_profile ON user_profiles FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_products ON products FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_orders ON orders FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_conversations ON conversations FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_messages ON messages FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_campaigns ON campaigns FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_activity ON activity_log FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_store ON store_config FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_settings ON app_settings FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_meta ON meta_accounts FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_themes ON brand_themes FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_posts ON generated_posts FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY own_sessions ON channel_sessions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
