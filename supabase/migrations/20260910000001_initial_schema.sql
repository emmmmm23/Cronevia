-- Initial Cronevia Schema Migration
-- This creates all tables, indexes, triggers, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  timezone VARCHAR(64) DEFAULT 'UTC',
  locale VARCHAR(16) DEFAULT 'en',
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
  account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_account_status ON profiles(account_status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'vintage' CHECK (theme IN ('vintage', 'light', 'dark')),
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(20) DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  timezone VARCHAR(64) DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile and settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    'active'
  );
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Super admin management functions
CREATE OR REPLACE FUNCTION promote_to_super_admin(target_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
  existing_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_admin_count
  FROM profiles
  WHERE role = 'super_admin';
  
  IF existing_admin_count > 0 THEN
    RETURN 'ERROR: Super Admin already exists. Only one Super Admin is allowed.';
  END IF;
  
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'ERROR: User not found with email: ' || target_user_email;
  END IF;
  
  UPDATE profiles
  SET role = 'super_admin'
  WHERE user_id = target_user_id;
  
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
  VALUES (target_user_id, 'PROMOTED_TO_SUPER_ADMIN', 'profiles', target_user_id);
  
  RETURN 'SUCCESS: User promoted to Super Admin: ' || target_user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Continue with remaining tables in next migration file...
