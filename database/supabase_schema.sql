-- ============================================================
-- CRONEVIA PostgreSQL Schema for Supabase
-- ============================================================
-- Converted from Laravel MySQL migrations
-- Date: September 10, 2026
-- 
-- IMPORTANT SECURITY NOTES:
-- 1. RLS policies are in a separate file: supabase_rls_policies.sql
-- 2. Never expose the service_role key to frontend
-- 3. All user data is protected by Row Level Security
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
-- This extends auth.users with application-specific profile data
-- Connected to Supabase Auth via user_id -> auth.users.id

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  timezone VARCHAR(64) DEFAULT 'UTC',
  locale VARCHAR(16) DEFAULT 'en',
  
  -- Role: NEVER allow frontend to modify this directly
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
  
  -- Account status
  account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_account_status ON profiles(account_status);

-- Updated_at trigger for profiles
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
  
  -- Appearance
  theme VARCHAR(20) DEFAULT 'vintage' CHECK (theme IN ('vintage', 'light', 'dark')),
  
  -- Formats
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(20) DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  timezone VARCHAR(64) DEFAULT 'UTC',
  
  -- Notifications (for future use)
  email_notifications BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- LOCATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Address components
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_locations_city ON locations(city) WHERE city IS NOT NULL;
CREATE INDEX idx_locations_country ON locations(country) WHERE country IS NOT NULL;

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  destination VARCHAR(255),
  description TEXT,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Budget
  budget DECIMAL(12, 2),
  currency CHAR(3) DEFAULT 'USD',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'friends')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for trips
CREATE UNIQUE INDEX idx_trips_slug ON trips(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_start_date ON trips(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_deleted_at ON trips(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIP DAYS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  
  title VARCHAR(255),
  day_number INTEGER NOT NULL,
  date DATE,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(trip_id, day_number)
);

CREATE INDEX idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX idx_trip_days_date ON trip_days(date) WHERE date IS NOT NULL;

CREATE TRIGGER update_trip_days_updated_at
  BEFORE UPDATE ON trip_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ITINERARY ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS itinerary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Timing
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  
  -- Type
  item_type VARCHAR(20) DEFAULT 'activity' CHECK (item_type IN ('activity', 'transport', 'meal', 'lodging', 'other')),
  
  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Cost
  cost DECIMAL(10, 2),
  currency CHAR(3) DEFAULT 'USD',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped', 'cancelled')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itinerary_items_trip_day_id ON itinerary_items(trip_day_id);
CREATE INDEX idx_itinerary_items_location_id ON itinerary_items(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_itinerary_items_sort_order ON itinerary_items(trip_day_id, sort_order);

CREATE TRIGGER update_itinerary_items_updated_at
  BEFORE UPDATE ON itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MEMORIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Date and location
  memory_date DATE,
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Archive
  is_archived BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_trip_id ON memories(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_memories_memory_date ON memories(memory_date) WHERE memory_date IS NOT NULL;
CREATE INDEX idx_memories_is_archived ON memories(is_archived);
CREATE INDEX idx_memories_deleted_at ON memories(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- JOURNAL ENTRIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  trip_day_id UUID REFERENCES trip_days(id) ON DELETE SET NULL,
  itinerary_item_id UUID REFERENCES itinerary_items(id) ON DELETE SET NULL,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  
  -- Mood system (custom emoji + name)
  mood_emoji VARCHAR(10),
  mood_name VARCHAR(50),
  
  -- Legacy mood enum (for migration compatibility)
  mood_enum VARCHAR(20) CHECK (mood_enum IN ('happy', 'excited', 'peaceful', 'nostalgic', 'sad', 'anxious', 'neutral')),
  
  -- Location
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Weather (optional)
  weather VARCHAR(100),
  
  -- Privacy
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'friends')),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  
  -- Date
  entry_date DATE NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_trip_id ON journal_entries(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_is_archived ON journal_entries(is_archived);
CREATE INDEX idx_journal_entries_deleted_at ON journal_entries(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_journal_entries_mood ON journal_entries(mood_emoji) WHERE mood_emoji IS NOT NULL;

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MEDIA TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  
  -- File information
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  
  -- Image dimensions (if applicable)
  width INTEGER,
  height INTEGER,
  
  -- Metadata
  caption TEXT,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  is_profile_photo BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_media_memory_id ON media(memory_id) WHERE memory_id IS NOT NULL;
CREATE INDEX idx_media_journal_entry_id ON media(journal_entry_id) WHERE journal_entry_id IS NOT NULL;
CREATE INDEX idx_media_trip_id ON media(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_media_is_cover ON media(is_cover) WHERE is_cover = true;
CREATE INDEX idx_media_is_profile_photo ON media(is_profile_photo) WHERE is_profile_photo = true;

CREATE TRIGGER update_media_updated_at
  BEFORE UPDATE ON media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TIME CAPSULES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS time_capsules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Unlock mechanism (server-enforced)
  unlock_date DATE NOT NULL,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_capsules_user_id ON time_capsules(user_id);
CREATE INDEX idx_time_capsules_unlock_date ON time_capsules(unlock_date);
CREATE INDEX idx_time_capsules_is_unlocked ON time_capsules(is_unlocked);

CREATE TRIGGER update_time_capsules_updated_at
  BEFORE UPDATE ON time_capsules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TIME CAPSULE ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS time_capsule_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_capsule_id UUID NOT NULL REFERENCES time_capsules(id) ON DELETE CASCADE,
  
  -- Polymorphic reference
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('journal_entry', 'memory', 'trip', 'media')),
  item_id UUID NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(time_capsule_id, item_type, item_id)
);

CREATE INDEX idx_time_capsule_items_capsule_id ON time_capsule_items(time_capsule_id);
CREATE INDEX idx_time_capsule_items_item ON time_capsule_items(item_type, item_id);

CREATE TRIGGER update_time_capsule_items_updated_at
  BEFORE UPDATE ON time_capsule_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUTURE LETTERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS future_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_future_letters_user_id ON future_letters(user_id);
CREATE INDEX idx_future_letters_scheduled_for ON future_letters(scheduled_for);
CREATE INDEX idx_future_letters_sent_at ON future_letters(sent_at) WHERE sent_at IS NOT NULL;

CREATE TRIGGER update_future_letters_updated_at
  BEFORE UPDATE ON future_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TAGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#8B4513', -- Vintage brown
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(user_id, name);

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PEOPLE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(100),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_people_name ON people(user_id, name);

CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PIVOT TABLES
-- ============================================================

-- Journal Entry Tags
CREATE TABLE IF NOT EXISTS journal_entry_tag (
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (journal_entry_id, tag_id)
);

CREATE INDEX idx_journal_entry_tag_journal ON journal_entry_tag(journal_entry_id);
CREATE INDEX idx_journal_entry_tag_tag ON journal_entry_tag(tag_id);

-- Memory Tags
CREATE TABLE IF NOT EXISTS memory_tag (
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (memory_id, tag_id)
);

CREATE INDEX idx_memory_tag_memory ON memory_tag(memory_id);
CREATE INDEX idx_memory_tag_tag ON memory_tag(tag_id);

-- Trip Tags
CREATE TABLE IF NOT EXISTS trip_tag (
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, tag_id)
);

CREATE INDEX idx_trip_tag_trip ON trip_tag(trip_id);
CREATE INDEX idx_trip_tag_tag ON trip_tag(tag_id);

-- Journal Entry People
CREATE TABLE IF NOT EXISTS journal_entry_person (
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (journal_entry_id, person_id)
);

CREATE INDEX idx_journal_entry_person_journal ON journal_entry_person(journal_entry_id);
CREATE INDEX idx_journal_entry_person_person ON journal_entry_person(person_id);

-- Memory People
CREATE TABLE IF NOT EXISTS memory_person (
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (memory_id, person_id)
);

CREATE INDEX idx_memory_person_memory ON memory_person(memory_id);
CREATE INDEX idx_memory_person_person ON memory_person(person_id);

-- Trip People
CREATE TABLE IF NOT EXISTS trip_person (
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, person_id)
);

CREATE INDEX idx_trip_person_trip ON trip_person(trip_id);
CREATE INDEX idx_trip_person_person ON trip_person(person_id);

-- ============================================================
-- AUDIT LOGS TABLE (for Super Admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Additional data (JSON)
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to create profile automatically when user signs up
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

-- Trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SUPER ADMIN SETUP FUNCTION
-- ============================================================
-- This function should be called manually by database admin
-- NEVER expose this to the frontend

CREATE OR REPLACE FUNCTION create_super_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  admin_user_id UUID;
  existing_admin_count INTEGER;
BEGIN
  -- Check if super admin already exists
  SELECT COUNT(*) INTO existing_admin_count
  FROM profiles
  WHERE role = 'super_admin';
  
  IF existing_admin_count > 0 THEN
    RETURN 'ERROR: Super Admin already exists. Only one Super Admin is allowed.';
  END IF;
  
  -- Create user in auth.users (This would typically be done through Supabase Dashboard or API)
  -- For now, this is a placeholder - actual user creation should use Supabase Auth API
  
  RETURN 'SUCCESS: Please create the user through Supabase Dashboard first, then update their role.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manual function to promote existing user to super_admin
-- ONLY use this after verifying there are no other super admins
CREATE OR REPLACE FUNCTION promote_to_super_admin(target_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
  existing_admin_count INTEGER;
BEGIN
  -- Check if super admin already exists
  SELECT COUNT(*) INTO existing_admin_count
  FROM profiles
  WHERE role = 'super_admin';
  
  IF existing_admin_count > 0 THEN
    RETURN 'ERROR: Super Admin already exists. Only one Super Admin is allowed.';
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'ERROR: User not found with email: ' || target_user_email;
  END IF;
  
  -- Update role
  UPDATE profiles
  SET role = 'super_admin'
  WHERE user_id = target_user_id;
  
  -- Log the action
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
  VALUES (target_user_id, 'PROMOTED_TO_SUPER_ADMIN', 'profiles', target_user_id);
  
  RETURN 'SUCCESS: User promoted to Super Admin: ' || target_user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users with application-specific data';
COMMENT ON TABLE journal_entries IS 'Personal journal entries with mood tracking and location';
COMMENT ON TABLE trips IS 'Travel trips with itineraries and destinations';
COMMENT ON TABLE memories IS 'Archived moments linked to trips and journals';
COMMENT ON TABLE time_capsules IS 'Time-locked content collections';
COMMENT ON TABLE future_letters IS 'Scheduled emails to future self';
COMMENT ON TABLE audit_logs IS 'Security audit trail for administrative actions';

COMMENT ON COLUMN profiles.role IS 'SECURITY: Never allow frontend to modify directly. Only user or super_admin.';
COMMENT ON COLUMN profiles.account_status IS 'Account status: active, inactive, or suspended';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Next step: Run supabase_rls_policies.sql to enable Row Level Security
-- ============================================================
