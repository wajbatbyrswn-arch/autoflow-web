-- AutoFlow Supabase Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  store_name TEXT DEFAULT '',
  store_description TEXT DEFAULT '',
  nashir_api_key TEXT DEFAULT '',
  ai_model TEXT DEFAULT 'claude-haiku-4-5-20251001',
  ai_mode TEXT DEFAULT 'copilot',
  custom_system_prompt TEXT DEFAULT '',
  plan TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'inactive',
  subscription_expires_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  duration_days INTEGER DEFAULT 30,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'JOD',
  stock_status TEXT DEFAULT 'available',
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  customer_platform_id TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'open',
  ai_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  nashir_message_id TEXT UNIQUE,
  content TEXT NOT NULL,
  is_from_customer BOOLEAN DEFAULT TRUE,
  ai_suggestion TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_name TEXT DEFAULT '',
  product_id UUID REFERENCES products(id),
  product_name TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1,
  total_price DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users see only their own data)
CREATE POLICY "Users own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own products" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own messages via conversation" ON messages FOR ALL
  USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users own orders" ON orders FOR ALL USING (auth.uid() = user_id);
-- activation_codes: no RLS (service role only via backend)

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, store_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
