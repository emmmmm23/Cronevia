-- ============================================================
-- CRONEVIA SUPER ADMIN SYSTEM - Additional Tables
-- ============================================================
-- This file adds tables for the Super Admin system
-- Run this AFTER supabase_schema.sql and supabase_rls_policies.sql
-- Date: September 12, 2026
-- ============================================================

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================
-- Stores platform-wide settings controlled by Super Admin

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- General Settings
  application_name VARCHAR(100) DEFAULT 'Cronevia',
  application_description TEXT,
  default_timezone VARCHAR(64) DEFAULT 'UTC',
  default_language VARCHAR(16) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(20) DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  
  -- Platform Control
  registration_enabled BOOLEAN DEFAULT true,
  email_verification_required BOOLEAN DEFAULT false,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT DEFAULT 'We''re currently improving your experience. Please check back soon.',
  
  -- Appearance
  default_theme VARCHAR(20) DEFAULT 'vintage' CHECK (default_theme IN ('vintage', 'light', 'dark')),
  animations_enabled BOOLEAN DEFAULT true,
  vintage_effects_enabled BOOLEAN DEFAULT true,
  
  -- Limits
  max_file_size_mb INTEGER DEFAULT 10,
  max_files_per_upload INTEGER DEFAULT 10,
  
  -- Updated tracking
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Only one row allowed
  singleton BOOLEAN DEFAULT true UNIQUE CHECK (singleton = true)
);

-- Seed initial system settings
INSERT INTO system_settings (
  application_name,
  application_description,
  default_timezone,
  maintenance_mode
) VALUES (
  'Cronevia',
  'Plan → Live → Remember. Your personal journey through time.',
  'UTC',
  false
) ON CONFLICT (singleton) DO NOTHING;

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FEATURE SETTINGS TABLE
-- ============================================================
-- Controls which Cronevia features are enabled/disabled

CREATE TABLE IF NOT EXISTS feature_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  feature_key VARCHAR(50) NOT NULL UNIQUE,
  feature_name VARCHAR(100) NOT NULL,
  feature_description TEXT,
  enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed default features
INSERT INTO feature_settings (feature_key, feature_name, feature_description, enabled) VALUES
  ('journal', 'Journal', 'Personal journal entries with mood tracking', true),
  ('trips', 'Trips', 'Travel planning and itineraries', true),
  ('memories', 'Memories', 'Archived moments and experiences', true),
  ('timeline', 'Timeline', 'Personal timeline view', true),
  ('photo_uploads', 'Photo Uploads', 'Upload and manage photos', true),
  ('location_services', 'Location Services', 'Location tracking and maps', true),
  ('time_capsules', 'Time Capsules', 'Time-locked content collections', true),
  ('future_letters', 'Future Letters', 'Letters to your future self', true),
  ('map', 'Map View', 'Interactive map of locations', true),
  ('on_this_day', 'On This Day', 'Memories from past years', true)
ON CONFLICT (feature_key) DO NOTHING;

CREATE TRIGGER update_feature_settings_updated_at
  BEFORE UPDATE ON feature_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ADMIN NOTIFICATIONS TABLE
-- ============================================================
-- Stores Super Admin notification preferences

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification preferences
  notify_new_user BOOLEAN DEFAULT true,
  notify_user_reports BOOLEAN DEFAULT true,
  notify_suspicious_activity BOOLEAN DEFAULT true,
  notify_system_errors BOOLEAN DEFAULT true,
  notify_storage_warnings BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_admin_notifications_updated_at
  BEFORE UPDATE ON admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS POLICIES FOR ADMIN TABLES
-- ============================================================

-- System Settings: Only Super Admin can read/write
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin can view system settings"
  ON system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super Admin can update system settings"
  ON system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Feature Settings: Super Admin can manage, normal users can read enabled features
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin can view all feature settings"
  ON feature_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view enabled features"
  ON feature_settings
  FOR SELECT
  USING (enabled = true);

CREATE POLICY "Super Admin can update feature settings"
  ON feature_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Admin Notifications: Only Super Admin can manage
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin can manage own notifications"
  ON admin_notifications
  FOR ALL
  USING (
    auth.uid() = admin_user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() = admin_user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================================
-- HELPER FUNCTIONS FOR SUPER ADMIN
-- ============================================================

-- Function to get system settings (callable by anyone, but RLS protects actual data)
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  registration_enabled BOOLEAN,
  maintenance_mode BOOLEAN,
  maintenance_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.registration_enabled,
    s.maintenance_mode,
    s.maintenance_message
  FROM system_settings s
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM feature_settings
    WHERE feature_key = p_feature_key
    AND enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get count of super admins (for validation)
CREATE OR REPLACE FUNCTION count_super_admins()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM profiles
    WHERE role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action VARCHAR(100),
  p_entity_type VARCHAR(100) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUPER ADMIN CREATION FUNCTION
-- ============================================================
-- This function promotes an existing user to Super Admin
-- SECURITY: Only works if no Super Admin exists yet

CREATE OR REPLACE FUNCTION create_first_super_admin(
  p_user_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_existing_admin_count INTEGER;
BEGIN
  -- Check if Super Admin already exists
  SELECT COUNT(*) INTO v_existing_admin_count
  FROM profiles
  WHERE role = 'super_admin';
  
  IF v_existing_admin_count > 0 THEN
    RETURN 'ERROR: Super Admin already exists. Only one Super Admin is allowed.';
  END IF;
  
  -- Find user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN 'ERROR: User not found with email: ' || p_user_email;
  END IF;
  
  -- Promote user to Super Admin
  UPDATE profiles
  SET 
    role = 'super_admin',
    account_status = 'active',
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- Log the action
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_user_id,
    'SUPER_ADMIN_CREATED',
    'profiles',
    v_user_id,
    jsonb_build_object(
      'email', p_user_email,
      'promotion_method', 'create_first_super_admin'
    )
  );
  
  -- Create admin notifications settings
  INSERT INTO admin_notifications (admin_user_id)
  VALUES (v_user_id)
  ON CONFLICT (admin_user_id) DO NOTHING;
  
  RETURN 'SUCCESS: User promoted to Super Admin: ' || p_user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION TO REPLACE SUPER ADMIN (EMERGENCY USE ONLY)
-- ============================================================

CREATE OR REPLACE FUNCTION replace_super_admin(
  p_new_admin_email TEXT,
  p_confirmation_text TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_new_user_id UUID;
  v_old_user_id UUID;
BEGIN
  -- Require exact confirmation text for safety
  IF p_confirmation_text != 'REPLACE_SUPER_ADMIN' THEN
    RETURN 'ERROR: Invalid confirmation. Must provide exact text: REPLACE_SUPER_ADMIN';
  END IF;
  
  -- Get current Super Admin
  SELECT user_id INTO v_old_user_id
  FROM profiles
  WHERE role = 'super_admin'
  LIMIT 1;
  
  -- Find new user by email
  SELECT id INTO v_new_user_id
  FROM auth.users
  WHERE email = p_new_admin_email;
  
  IF v_new_user_id IS NULL THEN
    RETURN 'ERROR: New user not found with email: ' || p_new_admin_email;
  END IF;
  
  -- Prevent replacing with same user
  IF v_new_user_id = v_old_user_id THEN
    RETURN 'ERROR: New admin cannot be the same as current admin.';
  END IF;
  
  -- Demote old Super Admin
  IF v_old_user_id IS NOT NULL THEN
    UPDATE profiles
    SET role = 'user', updated_at = NOW()
    WHERE user_id = v_old_user_id;
    
    -- Log the demotion
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (
      v_old_user_id,
      'SUPER_ADMIN_DEMOTED',
      'profiles',
      v_old_user_id,
      jsonb_build_object('replacement_method', 'replace_super_admin')
    );
  END IF;
  
  -- Promote new Super Admin
  UPDATE profiles
  SET role = 'super_admin', account_status = 'active', updated_at = NOW()
  WHERE user_id = v_new_user_id;
  
  -- Log the promotion
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_new_user_id,
    'SUPER_ADMIN_CREATED',
    'profiles',
    v_new_user_id,
    jsonb_build_object(
      'email', p_new_admin_email,
      'promotion_method', 'replace_super_admin',
      'replaced_admin', v_old_user_id
    )
  );
  
  -- Transfer admin notifications
  UPDATE admin_notifications
  SET admin_user_id = v_new_user_id
  WHERE admin_user_id = v_old_user_id;
  
  INSERT INTO admin_notifications (admin_user_id)
  VALUES (v_new_user_id)
  ON CONFLICT (admin_user_id) DO NOTHING;
  
  RETURN 'SUCCESS: Super Admin replaced. New admin: ' || p_new_admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STATISTICS FUNCTIONS FOR DASHBOARD
-- ============================================================

-- Get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  suspended_users BIGINT,
  new_users_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE account_status = 'active')::BIGINT as active_users,
    COUNT(*) FILTER (WHERE account_status = 'suspended')::BIGINT as suspended_users,
    COUNT(*) FILTER (
      WHERE created_at >= DATE_TRUNC('month', NOW())
    )::BIGINT as new_users_this_month
  FROM profiles
  WHERE role != 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get content statistics
CREATE OR REPLACE FUNCTION get_content_statistics()
RETURNS TABLE (
  total_journal_entries BIGINT,
  total_trips BIGINT,
  total_memories BIGINT,
  total_photos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM journal_entries WHERE deleted_at IS NULL)::BIGINT,
    (SELECT COUNT(*) FROM trips WHERE deleted_at IS NULL)::BIGINT,
    (SELECT COUNT(*) FROM memories WHERE deleted_at IS NULL)::BIGINT,
    (SELECT COUNT(*) FROM media)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE system_settings IS 'Platform-wide settings controlled by Super Admin';
COMMENT ON TABLE feature_settings IS 'Feature toggles for Cronevia functionality';
COMMENT ON TABLE admin_notifications IS 'Super Admin notification preferences';

COMMENT ON FUNCTION create_first_super_admin IS 'Creates the first and only Super Admin account';
COMMENT ON FUNCTION replace_super_admin IS 'Emergency function to replace Super Admin (requires confirmation)';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a specific feature is enabled';
COMMENT ON FUNCTION get_system_settings IS 'Get public system settings (maintenance mode, registration status)';

-- ============================================================
-- END OF ADMIN SYSTEM SCHEMA
-- ============================================================
