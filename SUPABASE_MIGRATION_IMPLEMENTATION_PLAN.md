# CRONEVIA SUPABASE MIGRATION - COMPLETE IMPLEMENTATION PLAN

**Date Created:** September 11, 2026  
**Status:** 🔵 PLANNING PHASE  
**Production Data:** ⚠️ YES (3 users, 2 journals)  
**Migration Strategy:** INCREMENTAL WITH DATA PRESERVATION

---

## 📊 CURRENT STATE ASSESSMENT

### Production Database Status ✅ CONFIRMED

```
MySQL Database: cronevia
├── Users: 3 accounts
├── Journal Entries: 2 entries
├── Trips: 0
├── Memories: 0
└── Migrations: 20/24 applied (4 pending)
```

### Infrastructure
- **Backend:** Laravel 11 + MySQL (Local: 127.0.0.1:3306)
- **Frontend:** Vue 3 + Vite (Local: 127.0.0.1:5173)
- **Supabase Project:** Created (ID: lrgxrfyzakehsnifypmd)
- **Supabase Region:** ap-northeast-1 (Tokyo)
- **Storage:** Local (Cloudflare R2 not configured)

### ⚠️ CRITICAL FINDINGS

1. **Production Data Exists** - Must plan careful migration
2. **Pending Migrations** - 4 Laravel migrations not applied yet
3. **Supabase Anon Key Missing** - Frontend .env needs actual key
4. **Hybrid State** - Supabase configured but not actively used
5. **Backend Active** - Laravel still handling all requests

---

## 🎯 MIGRATION OBJECTIVES

### Primary Goals

1. ✅ **Preserve All Data** - 3 users and 2 journals must migrate safely
2. ✅ **Zero Downtime** - Users can continue working during migration
3. ✅ **Preserve UI** - No changes to Vue components or design
4. ✅ **Enhance Security** - Implement Row Level Security (RLS)
5. ✅ **Simplify Stack** - Reduce from Laravel+MySQL to Supabase only

### Success Criteria

- ✅ All 3 users can log in to Supabase
- ✅ All 2 journals accessible and editable
- ✅ New features work identically
- ✅ RLS prevents cross-user data access
- ✅ npm run build succeeds
- ✅ Vercel deployment works

---

## 📋 COMPLETE IMPLEMENTATION ROADMAP

### PHASE 0: PRE-MIGRATION PREPARATION (Day 1)

#### Task 0.1: Backup Everything
**Priority:** 🔴 CRITICAL  
**Time:** 30 minutes  
**Dependencies:** None

**Actions:**
```bash
# Backup MySQL database
cd backend
php artisan db:dump cronevia_backup_$(date +%Y%m%d).sql

# Backup .env files
cp frontend/.env frontend/.env.backup
cp backend/.env backend/.env.backup

# Commit all changes to Git
git add -A
git commit -m "Pre-migration backup - $(date)"
git tag v1.0-pre-migration
```

**Output:** 
- ✅ MySQL dump file
- ✅ .env backups
- ✅ Git tag for rollback

---

#### Task 0.2: Apply Pending Laravel Migrations
**Priority:** 🔴 CRITICAL  
**Time:** 15 minutes  
**Dependencies:** Task 0.1

**Actions:**
```bash
cd backend
php artisan migrate --force
php artisan migrate:status
```

**Verification:**
- All 24 migrations show "[Ran]" status
- No errors in console

---

#### Task 0.3: Export Current Data Structure
**Priority:** 🟡 HIGH  
**Time:** 30 minutes  
**Dependencies:** Task 0.2

**Actions:**
```bash
# Export current schema
cd backend
php artisan schema:dump --database=mysql > database/schema_export.sql

# Export user data as JSON for reference
php artisan tinker --execute="
  file_put_contents('storage/migration_data.json', json_encode([
    'users' => App\Models\User::with('profile')->get(),
    'journals' => App\Models\JournalEntry::with('media')->get(),
  ], JSON_PRETTY_PRINT));
"
```

**Output:**
- ✅ Full schema SQL file
- ✅ JSON export of existing data

---

#### Task 0.4: Get Supabase Anon Key
**Priority:** 🔴 CRITICAL  
**Time:** 5 minutes  
**Dependencies:** None

**Actions:**
1. Visit: https://supabase.com/dashboard/project/lrgxrfyzakehsnifypmd
2. Go to: Settings → API
3. Copy: `anon` `public` key
4. Update: `frontend/.env`

**Update File:** `frontend/.env`
```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZ3hyZnl6YWtlaHNuaWZ5cG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwNDg4MDAsImV4cCI6MjA0MTYyNDgwMH0.XXXXXX
```

**Verification:**
```bash
cd frontend
npm run dev
# Check browser console for Supabase connection
```

---

### PHASE 1: SUPABASE DATABASE SETUP (Day 1-2)

#### Task 1.1: Create Complete Database Schema
**Priority:** 🔴 CRITICAL  
**Time:** 3-4 hours  
**Dependencies:** Task 0.4

**Files to Create:**
1. `supabase/migrations/20260911000001_complete_schema.sql`
2. `supabase/migrations/20260911000002_rls_policies.sql`
3. `supabase/migrations/20260911000003_storage_setup.sql`
4. `supabase/migrations/20260911000004_helper_functions.sql`

**Schema Includes:**
- ✅ 14 main tables (users via auth.users, profiles, settings, journals, trips, etc.)
- ✅ 6 pivot tables (tags, people relationships)
- ✅ All foreign keys and constraints
- ✅ Indexes for performance
- ✅ UUID generation
- ✅ Timestamps with triggers
- ✅ Soft delete support (deleted_at columns)

**Key Tables:**
```sql
-- Core user tables
profiles
user_settings

-- Content tables
journal_entries
trips
trip_days
itinerary_items
memories

-- Media & files
media
locations

-- Social features
tags
people

-- Special features
time_capsules
time_capsule_items
future_letters

-- Admin
audit_logs

-- Pivot tables
journal_entry_tag
memory_tag
trip_tag
journal_entry_person
memory_person
trip_person
```

---

#### Task 1.2: Implement Row Level Security (RLS)
**Priority:** 🔴 CRITICAL  
**Time:** 2-3 hours  
**Dependencies:** Task 1.1

**For EVERY user table, create policies:**

```sql
-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own data
CREATE POLICY "Users can view own journals"
  ON journal_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own data
CREATE POLICY "Users can create own journals"
  ON journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own data
CREATE POLICY "Users can update own journals"
  ON journal_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own data
CREATE POLICY "Users can delete own journals"
  ON journal_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Apply to tables:**
- profiles ✅
- user_settings ✅
- journal_entries ✅
- trips ✅
- trip_days ✅ (via trip_id → trips.user_id)
- itinerary_items ✅ (via trip_day_id → trips.user_id)
- memories ✅
- media ✅
- locations ✅
- time_capsules ✅
- future_letters ✅
- tags ✅
- people ✅
- All pivot tables ✅

---

#### Task 1.3: Setup Storage Buckets
**Priority:** 🟡 HIGH  
**Time:** 1 hour  
**Dependencies:** Task 1.1

**Create Buckets:**

1. **avatars**
   - Public: true
   - Max file size: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp
   - Path: `{user_id}/{filename}`

2. **journal-photos**
   - Public: false (RLS protected)
   - Max file size: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp
   - Path: `{user_id}/{journal_id}/{filename}`

3. **trip-photos**
   - Public: false (RLS protected)
   - Max file size: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp
   - Path: `{user_id}/{trip_id}/{filename}`

**Storage RLS Policies:**
```sql
-- Users can upload to their own folder only
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'journal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own photos
CREATE POLICY "Users can view own photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'journal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'journal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

#### Task 1.4: Create Helper Functions
**Priority:** 🟢 MEDIUM  
**Time:** 1-2 hours  
**Dependencies:** Task 1.1

**Functions to Create:**

1. **Auto-create profile on signup**
```sql
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
```

2. **Super Admin Management**
```sql
CREATE OR REPLACE FUNCTION promote_to_super_admin(target_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
  existing_admin_count INTEGER;
BEGIN
  -- Check for existing super admin
  SELECT COUNT(*) INTO existing_admin_count
  FROM profiles
  WHERE role = 'super_admin';
  
  IF existing_admin_count > 0 THEN
    RETURN 'ERROR: Super Admin already exists';
  END IF;
  
  -- Find user
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'ERROR: User not found';
  END IF;
  
  -- Promote user
  UPDATE profiles
  SET role = 'super_admin'
  WHERE user_id = target_user_id;
  
  -- Log action
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
  VALUES (target_user_id, 'PROMOTED_TO_SUPER_ADMIN', 'profiles', target_user_id);
  
  RETURN 'SUCCESS: User promoted to Super Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Statistics Functions**
```sql
CREATE OR REPLACE FUNCTION get_user_statistics(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_journals', (SELECT COUNT(*) FROM journal_entries WHERE user_id = target_user_id AND deleted_at IS NULL),
    'total_trips', (SELECT COUNT(*) FROM trips WHERE user_id = target_user_id AND deleted_at IS NULL),
    'total_memories', (SELECT COUNT(*) FROM memories WHERE user_id = target_user_id AND deleted_at IS NULL),
    'total_photos', (SELECT COUNT(*) FROM media WHERE user_id = target_user_id),
    'places_visited', (SELECT COUNT(DISTINCT location_name) FROM journal_entries WHERE user_id = target_user_id AND location_name IS NOT NULL)
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### Task 1.5: Test Schema Locally
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Tasks 1.1-1.4

**Actions:**
```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Open Supabase Studio
# Visit: http://localhost:54323

# Verify:
# 1. All tables created
# 2. RLS enabled on all tables
# 3. Policies exist
# 4. Storage buckets created
# 5. Functions exist
```

**Manual Tests:**
1. Create test user in auth.users
2. Verify profile auto-created
3. Test RLS policies (try to access other user's data)
4. Test storage upload
5. Call helper functions

---

### PHASE 2: DATA MIGRATION (Day 2-3)

#### Task 2.1: Create Data Migration Script
**Priority:** 🔴 CRITICAL  
**Time:** 2-3 hours  
**Dependencies:** Task 1.5

**Create:** `scripts/migrate_data_to_supabase.js`

**Script Should:**
1. Connect to MySQL database
2. Connect to Supabase (using service role key)
3. Migrate users → auth.users + profiles
4. Migrate journal entries with relationships
5. Migrate media files (if any exist)
6. Generate migration report

**Key Considerations:**
- ⚠️ Passwords are hashed in Laravel (bcrypt)
- ⚠️ Supabase uses different auth.users structure
- ⚠️ Must preserve UUIDs if possible
- ⚠️ Must maintain referential integrity

**Approach:**
```javascript
// For each Laravel user:
// 1. Create auth.users entry (will trigger profile creation)
// 2. Update profile with additional data
// 3. Migrate user's journals
// 4. Migrate user's media
// 5. Update foreign keys
```

---

#### Task 2.2: Handle Password Migration
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Task 2.1

**Challenge:** Laravel uses bcrypt, Supabase uses different format

**Solutions:**

**Option A: Force Password Reset (RECOMMENDED)**
- Create users with temporary random passwords
- Send password reset emails to all 3 users
- Users set new passwords via Supabase Auth

**Option B: Manual Password Recreation**
- Contact 3 users individually
- Have them set new passwords during migration
- Supervised migration

**Option C: Preserve Hashes (COMPLEX)**
- Use Supabase custom password hash support
- Requires Supabase Enterprise features
- Not recommended for 3 users

**Recommended:** Option A

---

#### Task 2.3: Execute Data Migration
**Priority:** 🔴 CRITICAL  
**Time:** 30 minutes  
**Dependencies:** Task 2.2

**Actions:**
```bash
# Run migration script
node scripts/migrate_data_to_supabase.js

# Verify in Supabase Studio:
# - 3 users in auth.users
# - 3 profiles created
# - 2 journals migrated
# - Relationships intact
```

**Expected Output:**
```
✅ Migrated 3 users
✅ Migrated 2 journal entries
✅ Migrated 0 trips
✅ Migrated 0 memories
✅ Migrated 0 media files
✅ All foreign keys valid
✅ Migration complete
```

---

#### Task 2.4: Send Password Reset to Users
**Priority:** 🟡 HIGH  
**Time:** 30 minutes  
**Dependencies:** Task 2.3

**Actions:**
```javascript
// Using Supabase Admin API
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: 'user@example.com'
})

// Send email with reset link to all 3 users
```

**Email Template:**
```
Subject: Cronevia Password Reset - System Upgrade

Hi there!

We've upgraded Cronevia to use a new authentication system for better security.

Please reset your password using this link:
[Reset Link]

Your journals and data are safe and waiting for you.

Thanks,
Cronevia Team
```

---

### PHASE 3: FRONTEND MIGRATION - AUTHENTICATION (Day 3-4)

#### Task 3.1: Update Auth Store
**Priority:** 🔴 CRITICAL  
**Time:** 2-3 hours  
**Dependencies:** Task 2.4

**File:** `frontend/src/stores/auth.ts`

**Changes:**

**BEFORE (Laravel Sanctum):**
```typescript
// Using axios with CSRF cookies
async login(email: string, password: string) {
  await axios.get('/sanctum/csrf-cookie')
  await axios.post('/api/v1/auth/login', { email, password })
  await this.fetchUser()
}
```

**AFTER (Supabase Auth):**
```typescript
// Using Supabase Auth
async login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  
  this.user = data.user
  await this.fetchProfile()
}
```

**Complete Method List:**
- ✅ login()
- ✅ register()
- ✅ logout()
- ✅ fetchUser()
- ✅ fetchProfile()
- ✅ updateProfile()
- ✅ updatePassword()
- ✅ updateEmail()
- ✅ deleteAccount()
- ✅ checkAuth()

---

#### Task 3.2: Update Router Guards
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Task 3.1

**File:** `frontend/src/router/index.ts`

**BEFORE:**
```typescript
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    await authStore.checkAuth()
    if (!authStore.isAuthenticated) {
      return next('/login')
    }
  }
  next()
})
```

**AFTER:**
```typescript
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (to.meta.requiresAuth && !session) {
    return next('/login')
  }
  
  if (to.meta.guest && session) {
    return next('/')
  }
  
  next()
})
```

---

#### Task 3.3: Update Auth Pages
**Priority:** 🔴 CRITICAL  
**Time:** 2-3 hours  
**Dependencies:** Task 3.2

**Files to Update:**
1. `frontend/src/pages/LoginPage.vue`
2. `frontend/src/pages/RegisterPage.vue`
3. `frontend/src/pages/ForgotPasswordPage.vue` (create if missing)
4. `frontend/src/pages/ResetPasswordPage.vue` (create if missing)

**Key Changes:**
- Replace axios API calls with Supabase Auth methods
- Update error handling for Supabase error format
- Add email confirmation flow (optional)
- Update success/error messages

---

#### Task 3.4: Add Session Persistence
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Task 3.3

**File:** `frontend/src/main.ts`

**Add Session Listener:**
```typescript
// Initialize auth state on app load
supabase.auth.getSession().then(({ data: { session } }) => {
  const authStore = useAuthStore()
  if (session) {
    authStore.setSession(session)
  }
})

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  const authStore = useAuthStore()
  authStore.setSession(session)
})
```

---

#### Task 3.5: Test Authentication Flow
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Task 3.4

**Manual Tests:**
1. ✅ Register new user
2. ✅ Login with valid credentials
3. ✅ Login with invalid credentials (show error)
4. ✅ Logout (clear session)
5. ✅ Protected route redirect to login
6. ✅ Session persists after page refresh
7. ✅ Session persists across browser tabs
8. ✅ Password reset flow
9. ✅ Email confirmation (if enabled)

**Automated Tests:**
```bash
cd frontend
npm run test -- --grep "Authentication"
```

---

### PHASE 4: FRONTEND MIGRATION - CORE FEATURES (Day 4-7)

#### Task 4.1: Create Supabase Service Layer
**Priority:** 🟡 HIGH  
**Time:** 2 hours  
**Dependencies:** Task 3.5

**Create:** `frontend/src/services/supabase/`

**Files:**
1. `journal.service.ts` - Journal CRUD operations
2. `trip.service.ts` - Trip CRUD operations
3. `memory.service.ts` - Memory CRUD operations
4. `media.service.ts` - File upload/delete operations
5. `profile.service.ts` - Profile operations
6. `admin.service.ts` - Admin operations (RPC functions)

**Example:** `journal.service.ts`
```typescript
import { supabase } from '@/lib/supabase'
import type { JournalEntry } from '@/types'

export const journalService = {
  async getAll(): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, media(*)')
      .eq('deleted_at', null)
      .order('entry_date', { ascending: false })
    
    if (error) throw error
    return data
  },
  
  async getById(id: string): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, media(*)')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },
  
  async create(entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        ...entry,
        user_id: user!.id, // RLS will verify this matches auth.uid()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  async update(id: string, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(entry)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update({ is_archived: true })
      .eq('id', id)
    
    if (error) throw error
  },
  
  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update({ is_archived: false })
      .eq('id', id)
    
    if (error) throw error
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }
}
```

---

#### Task 4.2: Migrate Journal Feature
**Priority:** 🔴 CRITICAL  
**Time:** 4-6 hours  
**Dependencies:** Task 4.1

**Files to Update:**
1. `frontend/src/pages/JournalPage.vue`
2. `frontend/src/pages/JournalEditorPage.vue`
3. `frontend/src/stores/journal.ts`

**Changes:**
- Replace all axios calls with `journalService` methods
- Update TypeScript types to match PostgreSQL schema
- Test create, read, update, delete, archive, restore
- Test photo upload
- Test RLS (ensure User A can't see User B's journals)

**Verification:**
- ✅ Create new journal
- ✅ Edit existing journal
- ✅ Archive journal
- ✅ Restore journal
- ✅ Delete journal (soft delete)
- ✅ Upload photos
- ✅ View photos
- ✅ Delete photos
- ✅ Autosave works
- ✅ User isolation verified

---

#### Task 4.3: Migrate Trips Feature
**Priority:** 🔴 CRITICAL  
**Time:** 4-6 hours  
**Dependencies:** Task 4.1

**Files to Update:**
1. `frontend/src/pages/TripsPage.vue`
2. `frontend/src/pages/TripDetailPage.vue`
3. `frontend/src/pages/TripCreatePage.vue`
4. `frontend/src/stores/trips.ts`

**Changes:**
- Replace axios calls with `tripService` methods
- Handle trip_days and itinerary_items relationships
- Test destination reordering
- Test photo uploads
- Test cover photo setting

**Verification:**
- ✅ Create new trip
- ✅ Edit trip details
- ✅ Add destinations
- ✅ Reorder destinations
- ✅ Add itinerary items
- ✅ Upload trip photos
- ✅ Set cover photo
- ✅ Delete trip
- ✅ User isolation verified

---

#### Task 4.4: Migrate Memories Feature
**Priority:** 🟡 HIGH  
**Time:** 3-4 hours  
**Dependencies:** Task 4.1

**Files to Update:**
1. `frontend/src/pages/MemoriesPage.vue`
2. `frontend/src/stores/memories.ts`

**Changes:**
- Replace axios calls with `memoryService` methods
- Test archive/restore
- Test photo associations

---

#### Task 4.5: Migrate Media/Photo Uploads
**Priority:** 🔴 CRITICAL  
**Time:** 3-4 hours  
**Dependencies:** Tasks 4.2-4.4

**File:** `frontend/src/services/supabase/media.service.ts`

**Implementation:**
```typescript
export const mediaService = {
  async uploadJournalPhoto(
    journalId: string,
    file: File
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type')
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)')
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${user!.id}/${journalId}/${fileName}`
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('journal-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('journal-photos')
      .getPublicUrl(filePath)
    
    // Create media record
    const { data, error } = await supabase
      .from('media')
      .insert({
        user_id: user!.id,
        journal_entry_id: journalId,
        file_path: filePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size
      })
      .select()
      .single()
    
    if (error) throw error
    
    return publicUrl
  },
  
  async deletePhoto(mediaId: string): Promise<void> {
    // Get file path
    const { data: media } = await supabase
      .from('media')
      .select('file_path, journal_entry_id, trip_id')
      .eq('id', mediaId)
      .single()
    
    if (!media) throw new Error('Media not found')
    
    // Determine bucket
    const bucket = media.journal_entry_id 
      ? 'journal-photos' 
      : 'trip-photos'
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([media.file_path])
    
    if (storageError) throw storageError
    
    // Delete record
    const { error: dbError } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId)
    
    if (dbError) throw dbError
  }
}
```

---

#### Task 4.6: Migrate Dashboard/Statistics
**Priority:** 🟡 HIGH  
**Time:** 2-3 hours  
**Dependencies:** Tasks 4.2-4.4

**Files to Update:**
1. `frontend/src/pages/HomePage.vue`
2. `frontend/src/pages/DashboardPage.vue` (if separate)

**Changes:**
- Replace axios calls with Supabase RPC function calls
- Use `get_user_statistics()` function
- Calculate streaks client-side or via SQL function

**Example:**
```typescript
// Get statistics via RPC
const { data, error } = await supabase.rpc('get_user_statistics', {
  target_user_id: user.id
})

// Or query directly
const { count: journalCount } = await supabase
  .from('journal_entries')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .is('deleted_at', null)
```

---

### PHASE 5: FRONTEND MIGRATION - ADDITIONAL FEATURES (Day 7-9)

#### Task 5.1: Migrate Timeline / On This Day
**Priority:** 🟢 MEDIUM  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:** `frontend/src/pages/OnThisDayPage.vue`

**Query:**
```typescript
// Get entries from same day in previous years
const today = new Date()
const month = today.getMonth() + 1
const day = today.getDate()

const { data } = await supabase
  .from('journal_entries')
  .select('*')
  .eq('user_id', user.id)
  .gte('entry_date', `0000-${month}-${day}`)
  .lte('entry_date', `9999-${month}-${day}`)
  .order('entry_date', { ascending: false })
```

---

#### Task 5.2: Migrate Search
**Priority:** 🟢 MEDIUM  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:** `frontend/src/pages/SearchPage.vue`

**Implementation:**
```typescript
// Full-text search using PostgreSQL
const { data } = await supabase
  .from('journal_entries')
  .select('*')
  .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
  .eq('user_id', user.id)
  .is('deleted_at', null)
```

---

#### Task 5.3: Migrate Tags & People
**Priority:** 🟢 MEDIUM  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:** 
- `frontend/src/pages/TagsPage.vue`
- `frontend/src/pages/PeoplePage.vue`

**Changes:**
- Replace axios calls with Supabase queries
- Handle pivot table relationships

---

#### Task 5.4: Migrate Locations & Map
**Priority:** 🟢 MEDIUM  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:**
- `frontend/src/pages/MapPage.vue`
- `frontend/src/services/location.service.ts`

**Changes:**
- Query locations from Supabase
- Display on MapLibre GL map
- No changes to MapLibre code needed

---

#### Task 5.5: Migrate Time Capsules
**Priority:** 🟢 LOW  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:** `frontend/src/pages/TimeCapsulePage.vue`

**Changes:**
- Replace axios calls
- Handle time_capsule_items polymorphic relationships

---

#### Task 5.6: Migrate Future Letters
**Priority:** 🟢 LOW  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:** `frontend/src/pages/FutureLettersPage.vue`

**Note:** Sending emails will require Supabase Edge Function (Phase 7)

---

#### Task 5.7: Migrate Profile & Settings
**Priority:** 🟡 HIGH  
**Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

**Files:**
- `frontend/src/pages/ProfilePage.vue`
- `frontend/src/pages/SettingsPage.vue`

**Changes:**
- Replace axios calls with Supabase methods
- Use `supabase.auth.updateUser()` for password/email changes
- Upload avatar to `avatars` bucket

---

### PHASE 6: SUPER ADMIN MIGRATION (Day 9-10)

#### Task 6.1: Create Admin RPC Functions
**Priority:** 🟡 HIGH  
**Time:** 3-4 hours  
**Dependencies:** Phase 5 complete

**Create in migration:** `supabase/migrations/20260911000005_admin_functions.sql`

**Functions:**
1. `get_all_users()` - List all users with profiles
2. `get_user_details(user_id)` - Get specific user info
3. `suspend_user(user_id)` - Suspend user account
4. `reactivate_user(user_id)` - Reactivate user
5. `delete_user_account(user_id)` - Delete user
6. `get_system_statistics()` - Overall system stats
7. `get_audit_logs()` - Admin action history

**Example:**
```sql
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  account_status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller is super admin
  IF (SELECT role FROM profiles WHERE user_id = auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.account_status,
    u.created_at
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### Task 6.2: Update Admin Frontend
**Priority:** 🟡 HIGH  
**Time:** 2-3 hours  
**Dependencies:** Task 6.1

**Files:**
- `frontend/src/pages/admin/AdminDashboard.vue`
- `frontend/src/pages/admin/UserManagement.vue`

**Changes:**
- Replace axios calls with Supabase RPC calls
- Call admin functions
- Handle errors (unauthorized, etc.)

**Example:**
```typescript
// Get all users
const { data, error } = await supabase.rpc('get_all_users')

// Suspend user
const { error } = await supabase.rpc('suspend_user', {
  user_id: targetUserId
})
```

---

#### Task 6.3: Create Super Admin via SQL
**Priority:** 🔴 CRITICAL  
**Time:** 30 minutes  
**Dependencies:** Task 6.1

**Actions:**
```sql
-- Promote existing user to super admin
SELECT promote_to_super_admin('admin@cronevia.com');

-- Or create new user then promote
-- 1. Register user via frontend
-- 2. Run SQL function to promote
```

---

### PHASE 7: SUPABASE EDGE FUNCTIONS (Day 10-12)

#### Task 7.1: Setup Edge Functions
**Priority:** 🟢 MEDIUM  
**Time:** 1 hour  
**Dependencies:** Phase 6 complete

**Actions:**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Initialize Edge Functions
supabase functions new location-search
supabase functions new send-future-letter
supabase functions new weather-lookup
```

---

#### Task 7.2: Create Location Search Function
**Priority:** 🟢 MEDIUM  
**Time:** 2-3 hours  
**Dependencies:** Task 7.1

**File:** `supabase/functions/location-search/index.ts`

**Purpose:** Hide Maps API key from frontend

**Implementation:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { query } = await req.json()
  
  // Call Maps API (e.g., MapBox, Google Places)
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${Deno.env.get('MAPBOX_API_KEY')}`
  )
  
  const data = await response.json()
  
  // Return sanitized results
  return new Response(JSON.stringify({
    results: data.features.map(f => ({
      name: f.place_name,
      latitude: f.center[1],
      longitude: f.center[0]
    }))
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Deploy:**
```bash
supabase functions deploy location-search
```

---

#### Task 7.3: Create Future Letter Email Function
**Priority:** 🟢 LOW  
**Time:** 2-3 hours  
**Dependencies:** Task 7.1

**File:** `supabase/functions/send-future-letter/index.ts`

**Purpose:** Send scheduled emails for future letters

**Implementation:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Get letters scheduled for today
  // Send via email service (Resend, SendGrid, etc.)
  // Mark as sent
})
```

**Schedule with Cron:**
```sql
-- Create cron job (requires pg_cron extension)
SELECT cron.schedule(
  'send-future-letters',
  '0 9 * * *', -- Daily at 9 AM
  $$SELECT net.http_post(
    'https://<project>.supabase.co/functions/v1/send-future-letter',
    '{}',
    '{"Authorization": "Bearer <anon-key>"}'
  )$$
);
```

---

#### Task 7.4: Create Weather Lookup Function (Optional)
**Priority:** 🟢 LOW  
**Time:** 2 hours  
**Dependencies:** Task 7.1

**File:** `supabase/functions/weather-lookup/index.ts`

**Purpose:** Get weather for trip locations

---

### PHASE 8: TESTING & VERIFICATION (Day 12-14)

#### Task 8.1: Security Testing
**Priority:** 🔴 CRITICAL  
**Time:** 3-4 hours  
**Dependencies:** All phases complete

**Tests:**

1. **User Isolation Test**
```bash
# Create User A and User B
# User A creates journal
# User B tries to access User A's journal
# Expected: 403 Forbidden or empty result
```

2. **RLS Policy Test**
```sql
-- Try to read other user's data as authenticated user
SELECT * FROM journal_entries WHERE user_id != auth.uid();
-- Expected: Empty result
```

3. **Storage Access Test**
```bash
# User A uploads photo
# Get photo URL
# Try to access as User B
# Expected: 403 Forbidden
```

4. **Admin Function Test**
```bash
# Try to call admin RPC as regular user
# Expected: Error: Unauthorized
```

---

#### Task 8.2: Feature Testing
**Priority:** 🔴 CRITICAL  
**Time:** 4-6 hours  
**Dependencies:** Task 8.1

**Test All Features:**

**Authentication:**
- ✅ Register
- ✅ Login
- ✅ Logout
- ✅ Password reset
- ✅ Email change
- ✅ Session persistence

**Journal:**
- ✅ Create
- ✅ Read
- ✅ Update
- ✅ Archive
- ✅ Restore
- ✅ Delete
- ✅ Upload photo
- ✅ Delete photo

**Trips:**
- ✅ Create trip
- ✅ Add destinations
- ✅ Reorder destinations
- ✅ Upload photos
- ✅ Set cover photo
- ✅ Delete trip

**Memories:**
- ✅ Create
- ✅ Archive
- ✅ Restore
- ✅ Delete

**Profile:**
- ✅ Update name
- ✅ Upload avatar
- ✅ Delete avatar

**Settings:**
- ✅ Change password
- ✅ Change email
- ✅ Delete account

**Admin:**
- ✅ View users
- ✅ Suspend user
- ✅ View audit logs

---

#### Task 8.3: Performance Testing
**Priority:** 🟢 MEDIUM  
**Time:** 2 hours  
**Dependencies:** Task 8.2

**Tests:**
- Page load times
- Query performance
- Image loading
- Large dataset handling (create 50+ journals)

---

#### Task 8.4: Cross-Browser Testing
**Priority:** 🟢 MEDIUM  
**Time:** 2 hours  
**Dependencies:** Task 8.2

**Test on:**
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (Chrome, Safari)

---

### PHASE 9: DEPLOYMENT (Day 14-15)

#### Task 9.1: Deploy to Supabase Production
**Priority:** 🔴 CRITICAL  
**Time:** 1-2 hours  
**Dependencies:** Phase 8 complete

**Actions:**
```bash
# Link to remote project
supabase link --project-ref lrgxrfyzakehsnifypmd

# Push migrations to production
supabase db push

# Deploy Edge Functions
supabase functions deploy location-search
supabase functions deploy send-future-letter

# Set production secrets
supabase secrets set MAPBOX_API_KEY=xxx
supabase secrets set RESEND_API_KEY=xxx
```

**Verify:**
- All tables created
- RLS enabled
- Storage buckets exist
- Functions deployed

---

#### Task 9.2: Configure Frontend .env
**Priority:** 🔴 CRITICAL  
**Time:** 15 minutes  
**Dependencies:** Task 9.1

**Update:** `frontend/.env.production`

```env
VITE_SUPABASE_URL=https://lrgxrfyzakehsnifypmd.supabase.co
VITE_SUPABASE_ANON_KEY=<production-anon-key>
```

---

#### Task 9.3: Build Frontend
**Priority:** 🔴 CRITICAL  
**Time:** 30 minutes  
**Dependencies:** Task 9.2

**Actions:**
```bash
cd frontend
npm install
npm run build

# Verify build succeeds
# Check dist/ folder created
```

---

#### Task 9.4: Deploy to Vercel
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Task 9.3

**Actions:**

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Configure Vercel Project**
```bash
cd frontend
vercel
```

3. **Configure Settings:**
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. **Deploy:**
```bash
vercel --prod
```

---

#### Task 9.5: Verify Production Deployment
**Priority:** 🔴 CRITICAL  
**Time:** 1 hour  
**Dependencies:** Task 9.4

**Verification Checklist:**
- ✅ Site loads
- ✅ Login works
- ✅ Register works
- ✅ Journal CRUD works
- ✅ Photos upload
- ✅ RLS prevents cross-user access
- ✅ Admin functions work
- ✅ No console errors
- ✅ Mobile responsive
- ✅ SSL certificate valid

---

### PHASE 10: BACKEND RETIREMENT (Optional - Day 15+)

#### Task 10.1: Monitor Supabase Usage
**Priority:** 🟢 LOW  
**Time:** Ongoing  
**Dependencies:** Task 9.5

**Monitor:**
- Database queries
- Storage usage
- Function invocations
- Error rates

---

#### Task 10.2: Archive Backend
**Priority:** 🟢 LOW  
**Time:** 1 hour  
**Dependencies:** Task 10.1

**Actions:**
```bash
# Create archive branch
git checkout -b archive/laravel-backend
git push origin archive/laravel-backend

# Remove backend from main branch
git checkout main
# Move backend to archive folder (optional)
# Or delete entirely
git commit -m "Archive Laravel backend after Supabase migration"
```

---

## 📊 PROGRESS TRACKING

### Phase Completion Checklist

- [ ] **Phase 0:** Pre-Migration Preparation (Day 1)
  - [ ] Task 0.1: Backup Everything
  - [ ] Task 0.2: Apply Pending Laravel Migrations
  - [ ] Task 0.3: Export Current Data Structure
  - [ ] Task 0.4: Get Supabase Anon Key

- [ ] **Phase 1:** Supabase Database Setup (Day 1-2)
  - [ ] Task 1.1: Create Complete Database Schema
  - [ ] Task 1.2: Implement Row Level Security (RLS)
  - [ ] Task 1.3: Setup Storage Buckets
  - [ ] Task 1.4: Create Helper Functions
  - [ ] Task 1.5: Test Schema Locally

- [ ] **Phase 2:** Data Migration (Day 2-3)
  - [ ] Task 2.1: Create Data Migration Script
  - [ ] Task 2.2: Handle Password Migration
  - [ ] Task 2.3: Execute Data Migration
  - [ ] Task 2.4: Send Password Reset to Users

- [ ] **Phase 3:** Frontend Migration - Authentication (Day 3-4)
  - [ ] Task 3.1: Update Auth Store
  - [ ] Task 3.2: Update Router Guards
  - [ ] Task 3.3: Update Auth Pages
  - [ ] Task 3.4: Add Session Persistence
  - [ ] Task 3.5: Test Authentication Flow

- [ ] **Phase 4:** Frontend Migration - Core Features (Day 4-7)
  - [ ] Task 4.1: Create Supabase Service Layer
  - [ ] Task 4.2: Migrate Journal Feature
  - [ ] Task 4.3: Migrate Trips Feature
  - [ ] Task 4.4: Migrate Memories Feature
  - [ ] Task 4.5: Migrate Media/Photo Uploads
  - [ ] Task 4.6: Migrate Dashboard/Statistics

- [ ] **Phase 5:** Frontend Migration - Additional Features (Day 7-9)
  - [ ] Task 5.1: Migrate Timeline / On This Day
  - [ ] Task 5.2: Migrate Search
  - [ ] Task 5.3: Migrate Tags & People
  - [ ] Task 5.4: Migrate Locations & Map
  - [ ] Task 5.5: Migrate Time Capsules
  - [ ] Task 5.6: Migrate Future Letters
  - [ ] Task 5.7: Migrate Profile & Settings

- [ ] **Phase 6:** Super Admin Migration (Day 9-10)
  - [ ] Task 6.1: Create Admin RPC Functions
  - [ ] Task 6.2: Update Admin Frontend
  - [ ] Task 6.3: Create Super Admin via SQL

- [ ] **Phase 7:** Supabase Edge Functions (Day 10-12)
  - [ ] Task 7.1: Setup Edge Functions
  - [ ] Task 7.2: Create Location Search Function
  - [ ] Task 7.3: Create Future Letter Email Function
  - [ ] Task 7.4: Create Weather Lookup Function (Optional)

- [ ] **Phase 8:** Testing & Verification (Day 12-14)
  - [ ] Task 8.1: Security Testing
  - [ ] Task 8.2: Feature Testing
  - [ ] Task 8.3: Performance Testing
  - [ ] Task 8.4: Cross-Browser Testing

- [ ] **Phase 9:** Deployment (Day 14-15)
  - [ ] Task 9.1: Deploy to Supabase Production
  - [ ] Task 9.2: Configure Frontend .env
  - [ ] Task 9.3: Build Frontend
  - [ ] Task 9.4: Deploy to Vercel
  - [ ] Task 9.5: Verify Production Deployment

- [ ] **Phase 10:** Backend Retirement (Optional - Day 15+)
  - [ ] Task 10.1: Monitor Supabase Usage
  - [ ] Task 10.2: Archive Backend

---

## 🚨 RISK MITIGATION

### Critical Risks & Mitigation Strategies

**Risk 1: Data Loss During Migration**
- **Mitigation:** Complete backup before any changes (Phase 0)
- **Rollback Plan:** Keep MySQL database intact, restore from backup if needed
- **Testing:** Verify all 2 journals and 3 users migrated correctly

**Risk 2: Users Can't Log In After Migration**
- **Mitigation:** Force password reset for all users, send clear instructions
- **Alternative:** Manual migration with user assistance
- **Timeline:** Schedule during low-usage period

**Risk 3: RLS Policies Too Restrictive or Too Permissive**
- **Mitigation:** Comprehensive testing with two test users
- **Testing:** User A should NOT see User B's data
- **Verification:** Manual checks + automated tests

**Risk 4: Photo Upload Fails**
- **Mitigation:** Test uploads extensively during Phase 4
- **Validation:** Frontend + backend validation
- **Storage:** Proper bucket policies

**Risk 5: Super Admin Lock-out**
- **Mitigation:** Create super admin early, test thoroughly
- **Backup:** Keep SQL function access for emergency promotion
- **Documentation:** Clear instructions for admin creation

**Risk 6: Build Errors**
- **Mitigation:** Test `npm run build` frequently during development
- **Early Detection:** Run build after each major phase
- **TypeScript:** Fix type errors immediately

**Risk 7: Vercel Deployment Fails**
- **Mitigation:** Test build locally first
- **Environment Variables:** Double-check all required vars
- **Logs:** Monitor Vercel logs for errors

---

## ⏱️ TIMELINE SUMMARY

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| **Phase 0:** Pre-Migration | 2 hours | Day 1 AM | Day 1 AM |
| **Phase 1:** Database Setup | 8-10 hours | Day 1 PM | Day 2 |
| **Phase 2:** Data Migration | 4-5 hours | Day 2 | Day 3 |
| **Phase 3:** Auth Migration | 6-8 hours | Day 3 | Day 4 |
| **Phase 4:** Core Features | 16-20 hours | Day 4 | Day 7 |
| **Phase 5:** Additional Features | 12-16 hours | Day 7 | Day 9 |
| **Phase 6:** Super Admin | 6-8 hours | Day 9 | Day 10 |
| **Phase 7:** Edge Functions | 6-8 hours | Day 10 | Day 12 |
| **Phase 8:** Testing | 10-12 hours | Day 12 | Day 14 |
| **Phase 9:** Deployment | 3-4 hours | Day 14 | Day 15 |
| **Phase 10:** Backend Retirement | Optional | Day 15+ | - |

**Total Estimated Time:** 73-91 hours (~3-4 weeks at 20 hours/week)

---

## 📚 RESOURCES & DOCUMENTATION

### Supabase Documentation
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

### Migration Guides
- [Postgres Migration Guide](https://supabase.com/docs/guides/migrations)
- [Auth Migration](https://supabase.com/docs/guides/auth)

### Testing
- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- ✅ All 3 users migrated successfully
- ✅ All 2 journals accessible
- ✅ Zero unauthorized data access incidents
- ✅ 100% feature parity with Laravel backend
- ✅ Build success rate: 100%
- ✅ Deployment success

### Performance Metrics
- ✅ Page load time: <2 seconds
- ✅ API response time: <500ms
- ✅ Image load time: <1 second

### Security Metrics
- ✅ RLS enabled on all tables: 100%
- ✅ User isolation verified: Yes
- ✅ Storage policies enforced: Yes
- ✅ No service role key exposed: Yes

### User Experience Metrics
- ✅ UI unchanged: Yes
- ✅ Features work identically: Yes
- ✅ Users can log in: Yes
- ✅ No data loss: Yes

---

## 📝 NOTES & CONSIDERATIONS

### Important Decisions

1. **Password Reset Approach:** Recommended Option A (force reset for all users)
2. **Super Admin Creation:** Via SQL function (no public API)
3. **Email Sending:** Via Supabase Edge Function with Resend API
4. **Maps API:** Hide key via Edge Function
5. **Backend Retention:** Keep temporarily, archive after verified success

### Optional Enhancements (Post-Migration)

1. **Email Verification:** Add email confirmation on signup
2. **Two-Factor Auth:** Enhance security with 2FA
3. **Real-time Features:** Use Supabase real-time subscriptions
4. **Advanced Search:** Implement PostgreSQL full-text search
5. **Data Export:** Add export functionality
6. **Activity Log:** Track user actions

---

## 🎬 NEXT STEPS

### To Begin Migration:

1. **Review this plan thoroughly**
2. **Confirm production data backup**
3. **Schedule migration during low-usage period**
4. **Notify the 3 users about upcoming maintenance**
5. **Start with Phase 0: Backup Everything**

### Questions to Answer Before Starting:

1. ✅ Do you approve this migration plan? **[CONFIRMED]**
2. ⏳ When would you like to schedule the migration?
3. ⏳ Should we notify the 3 users beforehand?
4. ⏳ Do you have access to the Supabase dashboard?
5. ⏳ Do you have a MapBox or Google Maps API key?

---

## 📧 COMMUNICATION PLAN

### User Notification Template

**Subject:** Cronevia System Upgrade - Maintenance Notice

**Body:**
```
Hi there!

We're upgrading Cronevia's infrastructure for better performance and security.

What you need to know:
• Scheduled: [DATE/TIME]
• Duration: Approximately 2-3 hours
• Impact: You'll need to reset your password after the upgrade

After the upgrade:
• Visit Cronevia
• Click "Forgot Password"
• Reset your password
• All your journals and data will be intact

Thank you for your patience!
— Cronevia Team
```

---

## ✅ FINAL CHECKLIST

Before declaring migration complete, verify:

- [ ] All 3 users can log in
- [ ] All 2 journals visible and editable
- [ ] New journal creation works
- [ ] Photo uploads work
- [ ] Trip creation works
- [ ] Memory creation works
- [ ] Profile updates work
- [ ] Settings changes work
- [ ] Admin panel accessible (super admin only)
- [ ] User A cannot see User B's data
- [ ] Password reset works
- [ ] Email change works
- [ ] Account deletion works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Build succeeds
- [ ] Vercel deployment live
- [ ] SSL certificate valid
- [ ] Custom domain working (if applicable)

---

## 🎉 PROJECT COMPLETION

When all checkboxes are complete:

1. ✅ Migration successful
2. ✅ Update documentation
3. ✅ Archive Laravel backend
4. ✅ Celebrate! 🎊

**Cronevia will be running on:**
- ✅ Vue 3 + Vite frontend
- ✅ Supabase PostgreSQL database
- ✅ Supabase Authentication
- ✅ Supabase Storage
- ✅ Supabase Edge Functions
- ✅ Deployed on Vercel

**Architecture achieved:**
```
Vue 3 + Vite
     ↓
Supabase JavaScript Client
     ↓
  Supabase
  ├── Auth
  ├── PostgreSQL + RLS
  ├── Storage
  └── Edge Functions
```

**Simple. Secure. Scalable. Done.** ✅

---

**Document Version:** 1.0  
**Last Updated:** September 11, 2026  
**Status:** Ready for Implementation  
**Estimated Completion:** 3-4 weeks  
**Total Tasks:** 10 Phases, 60+ Individual Tasks

---

**Ready to begin? Let's start with Phase 0: Pre-Migration Preparation!** 🚀
