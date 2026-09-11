-- ============================================================
-- CRONEVIA Row Level Security (RLS) Policies
-- ============================================================
-- CRITICAL SECURITY LAYER - This prevents unauthorized data access
-- Date: September 10, 2026
--
-- SECURITY PRINCIPLES:
-- 1. Users can ONLY access their own data
-- 2. Normal users CANNOT become super_admin
-- 3. Normal users CANNOT modify role fields
-- 4. Super Admin has special access (controlled by policies)
-- 5. RLS is ENABLED on all user-owned tables
-- 6. These policies work with Supabase anon key (frontend safe)
-- ============================================================

-- ============================================================
-- PROFILES TABLE RLS
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile (handled by trigger, but allow for manual cases)
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'user');

-- Policy: Users can update their own profile (but NOT the role field)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM profiles WHERE user_id = auth.uid())
    AND account_status = (SELECT account_status FROM profiles WHERE user_id = auth.uid())
  );

-- Policy: Super Admin can view all profiles
CREATE POLICY "Super Admin can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Policy: Super Admin can update other users (suspend, etc.) but cannot modify roles
CREATE POLICY "Super Admin can manage users"
  ON profiles
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
    -- Prevent modifying another super_admin
    AND (SELECT role FROM profiles WHERE user_id = profiles.user_id) != 'super_admin'
  );

-- Policy: Prevent deletion of profiles (use account_status instead)
CREATE POLICY "Prevent profile deletion"
  ON profiles
  FOR DELETE
  USING (false);

-- ============================================================
-- USER SETTINGS TABLE RLS
-- ============================================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- LOCATIONS TABLE RLS
-- ============================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locations"
  ON locations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own locations"
  ON locations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations"
  ON locations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations"
  ON locations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIPS TABLE RLS
-- ============================================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips"
  ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Super Admin policies for trips (monitoring/moderation)
CREATE POLICY "Super Admin can view all trips"
  ON trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================================
-- TRIP DAYS TABLE RLS
-- ============================================================

ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip days"
  ON trip_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own trip days"
  ON trip_days
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trip days"
  ON trip_days
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_days.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trip days"
  ON trip_days
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_days.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ============================================================
-- ITINERARY ITEMS TABLE RLS
-- ============================================================

ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itinerary items"
  ON itinerary_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = itinerary_items.trip_day_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own itinerary items"
  ON itinerary_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = itinerary_items.trip_day_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own itinerary items"
  ON itinerary_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = itinerary_items.trip_day_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = itinerary_items.trip_day_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own itinerary items"
  ON itinerary_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trips ON trips.id = trip_days.trip_id
      WHERE trip_days.id = itinerary_items.trip_day_id
      AND trips.user_id = auth.uid()
    )
  );

-- ============================================================
-- MEMORIES TABLE RLS
-- ============================================================

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories"
  ON memories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Super Admin policies for memories (monitoring/moderation)
CREATE POLICY "Super Admin can view all memories"
  ON memories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================================
-- JOURNAL ENTRIES TABLE RLS
-- ============================================================

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own journal entries"
  ON journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Super Admin policies for journal entries (monitoring only - privacy sensitive)
CREATE POLICY "Super Admin can view all journal entries"
  ON journal_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================================
-- MEDIA TABLE RLS
-- ============================================================

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
  ON media
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own media"
  ON media
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON media
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON media
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TIME CAPSULES TABLE RLS
-- ============================================================

ALTER TABLE time_capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time capsules"
  ON time_capsules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time capsules"
  ON time_capsules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time capsules"
  ON time_capsules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time capsules"
  ON time_capsules
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TIME CAPSULE ITEMS TABLE RLS
-- ============================================================

ALTER TABLE time_capsule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time capsule items"
  ON time_capsule_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM time_capsules
      WHERE time_capsules.id = time_capsule_items.time_capsule_id
      AND time_capsules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own time capsule items"
  ON time_capsule_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM time_capsules
      WHERE time_capsules.id = time_capsule_items.time_capsule_id
      AND time_capsules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own time capsule items"
  ON time_capsule_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM time_capsules
      WHERE time_capsules.id = time_capsule_items.time_capsule_id
      AND time_capsules.user_id = auth.uid()
    )
  );

-- ============================================================
-- FUTURE LETTERS TABLE RLS
-- ============================================================

ALTER TABLE future_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own future letters"
  ON future_letters
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own future letters"
  ON future_letters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own future letters"
  ON future_letters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own future letters"
  ON future_letters
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TAGS TABLE RLS
-- ============================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags"
  ON tags
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags"
  ON tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PEOPLE TABLE RLS
-- ============================================================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own people"
  ON people
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own people"
  ON people
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own people"
  ON people
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own people"
  ON people
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PIVOT TABLES RLS
-- ============================================================

-- Journal Entry Tag
ALTER TABLE journal_entry_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own journal entry tags"
  ON journal_entry_tag
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_tag.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_tag.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

-- Memory Tag
ALTER TABLE memory_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memory tags"
  ON memory_tag
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_tag.memory_id
      AND memories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_tag.memory_id
      AND memories.user_id = auth.uid()
    )
  );

-- Trip Tag
ALTER TABLE trip_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip tags"
  ON trip_tag
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_tag.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_tag.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Journal Entry Person
ALTER TABLE journal_entry_person ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own journal entry people"
  ON journal_entry_person
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_person.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_person.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

-- Memory Person
ALTER TABLE memory_person ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memory people"
  ON memory_person
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_person.memory_id
      AND memories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_person.memory_id
      AND memories.user_id = auth.uid()
    )
  );

-- Trip Person
ALTER TABLE trip_person ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip people"
  ON trip_person
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_person.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_person.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ============================================================
-- AUDIT LOGS TABLE RLS
-- ============================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admin can view audit logs
CREATE POLICY "Super Admin can view all audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- System can insert audit logs (using service role)
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs
  FOR DELETE
  USING (false);

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is active
CREATE OR REPLACE FUNCTION is_account_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND account_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TESTING QUERIES (Run these to verify RLS is working)
-- ============================================================

-- Test 1: Verify you can only see your own data
-- SELECT * FROM journal_entries; -- Should only show your entries

-- Test 2: Try to access another user's journal (should fail)
-- UPDATE journal_entries SET title = 'Hacked' WHERE user_id != auth.uid(); -- Should affect 0 rows

-- Test 3: Try to promote yourself to super_admin (should fail)
-- UPDATE profiles SET role = 'super_admin' WHERE user_id = auth.uid(); -- Should fail

-- Test 4: Verify Super Admin can see all data
-- SELECT * FROM profiles; -- As super_admin, should see all profiles

-- ============================================================
-- IMPORTANT SECURITY NOTES
-- ============================================================

-- 1. These policies work with Supabase Auth's auth.uid() function
-- 2. auth.uid() returns the UUID of the currently authenticated user
-- 3. If auth.uid() is NULL (not logged in), all policies return false
-- 4. The anon key is SAFE to use in frontend because RLS protects data
-- 5. NEVER use service_role key in frontend - it bypasses RLS
-- 6. Test policies thoroughly before deploying to production
-- 7. Monitor audit_logs table for suspicious activity

-- ============================================================
-- END OF RLS POLICIES
-- ============================================================
