# CRONEVIA MIGRATION - FILE-BY-FILE BREAKDOWN

**Complete list of every file that will be created or modified during migration**

---

## 📂 FILES TO CREATE (37 files)

### Supabase Migrations (5 files)

#### 1. `supabase/migrations/20260911000001_complete_schema.sql`
**Purpose:** Create all database tables  
**Size:** ~1000 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 1.1

**Contents:**
- Enable UUID extension
- Create profiles table
- Create user_settings table
- Create journal_entries table
- Create trips table
- Create trip_days table
- Create itinerary_items table
- Create memories table
- Create media table
- Create locations table
- Create time_capsules table
- Create time_capsule_items table
- Create future_letters table
- Create tags table
- Create people table
- Create audit_logs table
- Create pivot tables (6 tables)
- Add foreign keys
- Add indexes
- Add triggers for updated_at

---

#### 2. `supabase/migrations/20260911000002_rls_policies.sql`
**Purpose:** Implement Row Level Security  
**Size:** ~800 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 1.2

**Contents:**
For each user table (14 tables):
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- SELECT policy (view own data)
- INSERT policy (create own data)
- UPDATE policy (update own data)
- DELETE policy (delete own data)

Special policies for related tables:
- trip_days (via trip_id → trips.user_id)
- itinerary_items (via trip_day_id → trip_days.trip_id → trips.user_id)
- Pivot tables (via parent relationship)

---

#### 3. `supabase/migrations/20260911000003_storage_setup.sql`
**Purpose:** Configure storage buckets  
**Size:** ~200 lines  
**Priority:** 🟡 HIGH  
**Phase:** 1.3

**Contents:**
- Create 'avatars' bucket
- Create 'journal-photos' bucket
- Create 'trip-photos' bucket
- Storage RLS policies for each bucket:
  - Upload policy (users can upload to own folder)
  - View policy (users can view own files)
  - Delete policy (users can delete own files)

---

#### 4. `supabase/migrations/20260911000004_helper_functions.sql`
**Purpose:** SQL helper functions  
**Size:** ~300 lines  
**Priority:** 🟢 MEDIUM  
**Phase:** 1.4

**Contents:**
- `handle_new_user()` - Auto-create profile on signup
- `promote_to_super_admin(email)` - Promote user to admin
- `demote_from_super_admin(email)` - Demote admin (if needed)
- `get_user_statistics(user_id)` - Calculate user stats
- `get_writing_streak(user_id)` - Calculate journal streak
- `update_updated_at_column()` - Trigger function for timestamps

---

#### 5. `supabase/migrations/20260911000005_admin_functions.sql`
**Purpose:** Super Admin RPC functions  
**Size:** ~500 lines  
**Priority:** 🟡 HIGH  
**Phase:** 6.1

**Contents:**
- `get_all_users()` - List all users (admin only)
- `get_user_details(user_id)` - User details (admin only)
- `suspend_user(user_id)` - Suspend account (admin only)
- `reactivate_user(user_id)` - Reactivate account (admin only)
- `delete_user_account(user_id)` - Delete user (admin only)
- `get_system_statistics()` - System-wide stats (admin only)
- `get_database_status()` - Database health (admin only)
- `get_audit_logs(limit, offset)` - Audit history (admin only)

Each function includes:
- Super admin role check
- Error handling
- Audit logging
- Return appropriate data

---

### Frontend Services (6 files)

#### 6. `frontend/src/services/supabase/journal.service.ts`
**Purpose:** Journal CRUD operations  
**Size:** ~300 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.1

**Exports:**
```typescript
export const journalService = {
  getAll(): Promise<JournalEntry[]>
  getById(id: string): Promise<JournalEntry>
  getArchived(): Promise<JournalEntry[]>
  create(entry: Partial<JournalEntry>): Promise<JournalEntry>
  update(id: string, entry: Partial<JournalEntry>): Promise<JournalEntry>
  archive(id: string): Promise<void>
  restore(id: string): Promise<void>
  delete(id: string): Promise<void>
  search(query: string): Promise<JournalEntry[]>
}
```

---

#### 7. `frontend/src/services/supabase/trip.service.ts`
**Purpose:** Trip CRUD operations  
**Size:** ~400 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.1

**Exports:**
```typescript
export const tripService = {
  getAll(): Promise<Trip[]>
  getById(id: string): Promise<Trip>
  create(trip: Partial<Trip>): Promise<Trip>
  update(id: string, trip: Partial<Trip>): Promise<Trip>
  delete(id: string): Promise<void>
  
  // Trip Days
  addDay(tripId: string, day: Partial<TripDay>): Promise<TripDay>
  updateDay(dayId: string, day: Partial<TripDay>): Promise<TripDay>
  deleteDay(dayId: string): Promise<void>
  
  // Itinerary Items
  addItineraryItem(dayId: string, item: Partial<ItineraryItem>): Promise<ItineraryItem>
  updateItineraryItem(itemId: string, item: Partial<ItineraryItem>): Promise<ItineraryItem>
  reorderItineraryItems(dayId: string, itemIds: string[]): Promise<void>
  deleteItineraryItem(itemId: string): Promise<void>
}
```

---

#### 8. `frontend/src/services/supabase/memory.service.ts`
**Purpose:** Memory CRUD operations  
**Size:** ~250 lines  
**Priority:** 🟡 HIGH  
**Phase:** 4.1

**Exports:**
```typescript
export const memoryService = {
  getAll(): Promise<Memory[]>
  getById(id: string): Promise<Memory>
  getArchived(): Promise<Memory[]>
  create(memory: Partial<Memory>): Promise<Memory>
  update(id: string, memory: Partial<Memory>): Promise<Memory>
  archive(id: string): Promise<void>
  restore(id: string): Promise<void>
  delete(id: string): Promise<void>
}
```

---

#### 9. `frontend/src/services/supabase/media.service.ts`
**Purpose:** File upload/delete operations  
**Size:** ~400 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.1

**Exports:**
```typescript
export const mediaService = {
  // Journal Photos
  uploadJournalPhoto(journalId: string, file: File): Promise<string>
  getJournalPhotos(journalId: string): Promise<Media[]>
  deleteJournalPhoto(mediaId: string): Promise<void>
  
  // Trip Photos
  uploadTripPhoto(tripId: string, file: File): Promise<string>
  getTripPhotos(tripId: string): Promise<Media[]>
  setTripCoverPhoto(tripId: string, mediaId: string): Promise<void>
  deleteTripPhoto(mediaId: string): Promise<void>
  
  // Avatar
  uploadAvatar(file: File): Promise<string>
  deleteAvatar(): Promise<void>
  
  // Validation
  validateFile(file: File): boolean
  validateImageType(file: File): boolean
  validateFileSize(file: File, maxSizeMB: number): boolean
}
```

---

#### 10. `frontend/src/services/supabase/profile.service.ts`
**Purpose:** Profile operations  
**Size:** ~200 lines  
**Priority:** 🟡 HIGH  
**Phase:** 4.1

**Exports:**
```typescript
export const profileService = {
  getProfile(): Promise<Profile>
  updateProfile(profile: Partial<Profile>): Promise<Profile>
  getStatistics(): Promise<UserStatistics>
  getSettings(): Promise<UserSettings>
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>
}
```

---

#### 11. `frontend/src/services/supabase/admin.service.ts`
**Purpose:** Admin RPC operations  
**Size:** ~300 lines  
**Priority:** 🟡 HIGH  
**Phase:** 6.2

**Exports:**
```typescript
export const adminService = {
  // User Management
  getAllUsers(): Promise<User[]>
  getUserDetails(userId: string): Promise<UserDetails>
  suspendUser(userId: string): Promise<void>
  reactivateUser(userId: string): Promise<void>
  deleteUser(userId: string): Promise<void>
  
  // System Stats
  getSystemStatistics(): Promise<SystemStats>
  getDatabaseStatus(): Promise<DatabaseStatus>
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>
}
```

---

### Edge Functions (3 files)

#### 12. `supabase/functions/location-search/index.ts`
**Purpose:** Hide Maps API key, provide location search  
**Size:** ~150 lines  
**Priority:** 🟢 MEDIUM  
**Phase:** 7.2

**Endpoint:** `POST /functions/v1/location-search`  
**Input:** `{ query: string }`  
**Output:** `{ results: LocationResult[] }`

---

#### 13. `supabase/functions/send-future-letter/index.ts`
**Purpose:** Send scheduled future letters via email  
**Size:** ~200 lines  
**Priority:** 🟢 LOW  
**Phase:** 7.3

**Endpoint:** Cron job calls this  
**Process:** Query letters due today → Send emails → Mark as sent

---

#### 14. `supabase/functions/weather-lookup/index.ts`
**Purpose:** Get weather data for trip locations (optional)  
**Size:** ~150 lines  
**Priority:** 🟢 LOW  
**Phase:** 7.4

**Endpoint:** `POST /functions/v1/weather-lookup`  
**Input:** `{ latitude: number, longitude: number, date: string }`  
**Output:** `{ weather: WeatherData }`

---

### Scripts (1 file)

#### 15. `scripts/migrate_data_to_supabase.js`
**Purpose:** Migrate users and journals from MySQL to Supabase  
**Size:** ~400 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 2.1

**Process:**
1. Connect to MySQL
2. Connect to Supabase (with service role key)
3. For each user in MySQL:
   - Create auth.users entry in Supabase
   - Trigger will auto-create profile
   - Update profile with additional data
4. For each journal in MySQL:
   - Insert into journal_entries with correct user_id
5. Generate migration report
6. Log any errors

---

### TypeScript Types (2 files)

#### 16. `frontend/src/types/database.types.ts`
**Purpose:** Auto-generated types from Supabase schema  
**Size:** ~500 lines  
**Priority:** 🟡 HIGH  
**Phase:** 1.5

**Generated via:**
```bash
supabase gen types typescript --local > frontend/src/types/database.types.ts
```

---

#### 17. `frontend/src/types/supabase.types.ts`
**Purpose:** Custom types for Supabase operations  
**Size:** ~200 lines  
**Priority:** 🟡 HIGH  
**Phase:** 4.1

**Exports:**
```typescript
export interface JournalEntry { ... }
export interface Trip { ... }
export interface TripDay { ... }
export interface ItineraryItem { ... }
export interface Memory { ... }
export interface Media { ... }
export interface Profile { ... }
export interface UserSettings { ... }
export interface UserStatistics { ... }
// etc.
```

---

### Documentation (12 files)

#### 18-29. Documentation Files
- `docs/SUPABASE_SETUP.md` - Setup guide
- `docs/DATABASE_SCHEMA.md` - Schema documentation
- `docs/RLS_POLICIES.md` - Security policies explained
- `docs/API_REFERENCE.md` - Supabase queries reference
- `docs/EDGE_FUNCTIONS.md` - Edge Functions guide
- `docs/AUTHENTICATION.md` - Auth flow documentation
- `docs/STORAGE.md` - File upload guide
- `docs/ADMIN_GUIDE.md` - Super Admin instructions
- `docs/DEPLOYMENT.md` - Vercel deployment guide
- `docs/TESTING.md` - Testing procedures
- `docs/TROUBLESHOOTING.md` - Common issues
- `docs/MIGRATION_REPORT.md` - Final migration summary

---

### Environment Files (2 files)

#### 30. `frontend/.env.production`
**Purpose:** Production environment variables  
**Size:** ~10 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 9.2

**Contents:**
```env
VITE_SUPABASE_URL=https://lrgxrfyzakehsnifypmd.supabase.co
VITE_SUPABASE_ANON_KEY=<production-anon-key>
VITE_SENTRY_DSN=<optional-sentry-dsn>
```

---

#### 31. `supabase/.env`
**Purpose:** Edge Function secrets  
**Size:** ~10 lines  
**Priority:** 🟢 MEDIUM  
**Phase:** 7.1

**Contents:**
```env
MAPBOX_API_KEY=<your-mapbox-key>
RESEND_API_KEY=<your-resend-key>
WEATHER_API_KEY=<your-weather-key>
```

---

### Vercel Configuration (1 file)

#### 32. `vercel.json` (may already exist)
**Purpose:** Vercel deployment configuration  
**Size:** ~30 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 9.4

**Contents:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

---

### GitHub Actions (Optional - 2 files)

#### 33. `.github/workflows/test.yml`
**Purpose:** Run tests on push  
**Size:** ~50 lines  
**Priority:** 🟢 LOW  
**Phase:** 8

---

#### 34. `.github/workflows/deploy.yml`
**Purpose:** Auto-deploy to Vercel  
**Size:** ~60 lines  
**Priority:** 🟢 LOW  
**Phase:** 9

---

### Test Files (3 files)

#### 35. `frontend/src/tests/auth.test.ts`
**Purpose:** Test authentication flows  
**Size:** ~200 lines  
**Priority:** 🟡 HIGH  
**Phase:** 3.5

---

#### 36. `frontend/src/tests/rls.test.ts`
**Purpose:** Test RLS policies  
**Size:** ~300 lines  
**Priority:** 🔴 CRITICAL  
**Phase:** 8.1

---

#### 37. `frontend/src/tests/features.test.ts`
**Purpose:** Test core features  
**Size:** ~400 lines  
**Priority:** 🟡 HIGH  
**Phase:** 8.2

---

## 📝 FILES TO MODIFY (45 files)

### Authentication (6 files)

#### 1. `frontend/src/stores/auth.ts`
**Current:** Laravel Sanctum with axios  
**Changes:** Replace with Supabase Auth  
**Lines Changed:** ~200  
**Priority:** 🔴 CRITICAL  
**Phase:** 3.1

**Before:**
```typescript
async login(email: string, password: string) {
  await axios.get('/sanctum/csrf-cookie')
  await axios.post('/api/v1/auth/login', { email, password })
  await this.fetchUser()
}
```

**After:**
```typescript
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

**Methods to update:**
- `login()`
- `register()`
- `logout()`
- `fetchUser()` → `fetchProfile()`
- `checkAuth()`
- `updateProfile()`
- `updatePassword()`
- `updateEmail()`
- `deleteAccount()`

---

#### 2. `frontend/src/router/index.ts`
**Current:** Checks auth via store  
**Changes:** Check Supabase session  
**Lines Changed:** ~50  
**Priority:** 🔴 CRITICAL  
**Phase:** 3.2

**Before:**
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

**After:**
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

#### 3. `frontend/src/pages/LoginPage.vue`
**Current:** Calls auth store (which uses axios)  
**Changes:** Auth store now uses Supabase  
**Lines Changed:** ~20 (mostly template updates)  
**Priority:** 🔴 CRITICAL  
**Phase:** 3.3

---

#### 4. `frontend/src/pages/RegisterPage.vue`
**Current:** Calls auth store (which uses axios)  
**Changes:** Auth store now uses Supabase  
**Lines Changed:** ~30  
**Priority:** 🔴 CRITICAL  
**Phase:** 3.3

---

#### 5. `frontend/src/pages/ForgotPasswordPage.vue`
**Current:** May not exist  
**Changes:** Create new or update to use Supabase  
**Lines Changed:** ~150 (new file)  
**Priority:** 🟡 HIGH  
**Phase:** 3.3

**Implementation:**
```typescript
const handleForgotPassword = async () => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://cronevia.com/reset-password'
  })
  if (error) {
    // Show error
  } else {
    // Show success message
  }
}
```

---

#### 6. `frontend/src/pages/ResetPasswordPage.vue`
**Current:** May not exist  
**Changes:** Create new  
**Lines Changed:** ~200 (new file)  
**Priority:** 🟡 HIGH  
**Phase:** 3.3

---

### Main App (2 files)

#### 7. `frontend/src/main.ts`
**Current:** Basic Vue initialization  
**Changes:** Add Supabase auth listener  
**Lines Changed:** ~20  
**Priority:** 🔴 CRITICAL  
**Phase:** 3.4

**Add:**
```typescript
// Initialize auth state
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

#### 8. `frontend/src/App.vue`
**Current:** Layout wrapper  
**Changes:** Minimal (ensure auth state works)  
**Lines Changed:** ~10  
**Priority:** 🟢 LOW  
**Phase:** 3.4

---

### Journal Feature (3 files)

#### 9. `frontend/src/pages/JournalPage.vue`
**Current:** Axios API calls to Laravel  
**Changes:** Use `journalService`  
**Lines Changed:** ~100  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.2

**Before:**
```typescript
const fetchJournals = async () => {
  const response = await axios.get('/api/v1/journals')
  journals.value = response.data.data
}
```

**After:**
```typescript
const fetchJournals = async () => {
  journals.value = await journalService.getAll()
}
```

---

#### 10. `frontend/src/pages/JournalEditorPage.vue`
**Current:** Axios API calls  
**Changes:** Use `journalService`  
**Lines Changed:** ~150  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.2

---

#### 11. `frontend/src/stores/journal.ts`
**Current:** May not exist or uses axios  
**Changes:** Use Supabase queries directly or via service  
**Lines Changed:** ~200  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.2

---

### Trips Feature (4 files)

#### 12. `frontend/src/pages/TripsPage.vue`
**Current:** Axios API calls  
**Changes:** Use `tripService`  
**Lines Changed:** ~100  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.3

---

#### 13. `frontend/src/pages/TripDetailPage.vue`
**Current:** Axios API calls  
**Changes:** Use `tripService`  
**Lines Changed:** ~200  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.3

---

#### 14. `frontend/src/pages/TripCreatePage.vue`
**Current:** Axios API calls  
**Changes:** Use `tripService`  
**Lines Changed:** ~100  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.3

---

#### 15. `frontend/src/stores/trips.ts`
**Current:** Axios-based  
**Changes:** Supabase queries  
**Lines Changed:** ~250  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.3

---

### Memories Feature (2 files)

#### 16. `frontend/src/pages/MemoriesPage.vue`
**Current:** Axios API calls  
**Changes:** Use `memoryService`  
**Lines Changed:** ~100  
**Priority:** 🟡 HIGH  
**Phase:** 4.4

---

#### 17. `frontend/src/stores/memories.ts`
**Current:** May not exist  
**Changes:** Create with Supabase queries  
**Lines Changed:** ~200 (new file)  
**Priority:** 🟡 HIGH  
**Phase:** 4.4

---

### Dashboard (1 file)

#### 18. `frontend/src/pages/HomePage.vue`
**Current:** Axios API calls for stats  
**Changes:** Use Supabase RPC or direct queries  
**Lines Changed:** ~100  
**Priority:** 🟡 HIGH  
**Phase:** 4.6

**Before:**
```typescript
const stats = await axios.get('/api/v1/dashboard/stats')
```

**After:**
```typescript
const { data } = await supabase.rpc('get_user_statistics', {
  target_user_id: user.value.id
})
```

---

### Timeline (1 file)

#### 19. `frontend/src/pages/OnThisDayPage.vue`
**Current:** Axios API calls  
**Changes:** Supabase queries  
**Lines Changed:** ~80  
**Priority:** 🟢 MEDIUM  
**Phase:** 5.1

---

### Search (1 file)

#### 20. `frontend/src/pages/SearchPage.vue`
**Current:** Axios API calls  
**Changes:** Supabase full-text search  
**Lines Changed:** ~80  
**Priority:** 🟢 MEDIUM  
**Phase:** 5.2

---

### Map (1 file)

#### 21. `frontend/src/pages/MapPage.vue`
**Current:** Axios API calls for locations  
**Changes:** Supabase queries  
**Lines Changed:** ~60  
**Priority:** 🟢 MEDIUM  
**Phase:** 5.4

---

### Profile & Settings (2 files)

#### 22. `frontend/src/pages/ProfilePage.vue`
**Current:** Axios API calls  
**Changes:** Use `profileService`  
**Lines Changed:** ~100  
**Priority:** 🟡 HIGH  
**Phase:** 5.7

---

#### 23. `frontend/src/pages/SettingsPage.vue`
**Current:** Axios API calls  
**Changes:** Supabase auth methods + `profileService`  
**Lines Changed:** ~150  
**Priority:** 🟡 HIGH  
**Phase:** 5.7

**Example:**
```typescript
// Change password
const { error } = await supabase.auth.updateUser({
  password: newPassword
})

// Change email
const { error } = await supabase.auth.updateUser({
  email: newEmail
})
```

---

### Tags & People (2 files)

#### 24. `frontend/src/pages/TagsPage.vue`
**Current:** Axios API calls (if exists)  
**Changes:** Supabase queries  
**Lines Changed:** ~80  
**Priority:** 🟢 MEDIUM  
**Phase:** 5.3

---

#### 25. `frontend/src/pages/PeoplePage.vue`
**Current:** Axios API calls (if exists)  
**Changes:** Supabase queries  
**Lines Changed:** ~80  
**Priority:** 🟢 MEDIUM  
**Phase:** 5.3

---

### Time Capsules (1 file)

#### 26. `frontend/src/pages/TimeCapsulePage.vue`
**Current:** Axios API calls  
**Changes:** Supabase queries  
**Lines Changed:** ~100  
**Priority:** 🟢 LOW  
**Phase:** 5.5

---

### Future Letters (1 file)

#### 27. `frontend/src/pages/FutureLettersPage.vue`
**Current:** Axios API calls  
**Changes:** Supabase queries  
**Lines Changed:** ~100  
**Priority:** 🟢 LOW  
**Phase:** 5.6

---

### Admin Pages (2 files)

#### 28. `frontend/src/pages/admin/AdminDashboard.vue`
**Current:** Axios API calls  
**Changes:** Use `adminService` (RPC calls)  
**Lines Changed:** ~150  
**Priority:** 🟡 HIGH  
**Phase:** 6.2

---

#### 29. `frontend/src/pages/admin/UserManagement.vue`
**Current:** Axios API calls  
**Changes:** Use `adminService` (RPC calls)  
**Lines Changed:** ~200  
**Priority:** 🟡 HIGH  
**Phase:** 6.2

---

### Shared Components (5 files)

#### 30. `frontend/src/components/PhotoUpload.vue`
**Current:** Axios file upload  
**Changes:** Use `mediaService`  
**Lines Changed:** ~50  
**Priority:** 🔴 CRITICAL  
**Phase:** 4.5

---

#### 31. `frontend/src/components/JournalCard.vue`
**Current:** Display component (minimal changes)  
**Changes:** Update props to match new types  
**Lines Changed:** ~20  
**Priority:** 🟢 LOW  
**Phase:** 4.2

---

#### 32. `frontend/src/components/TripCard.vue`
**Current:** Display component  
**Changes:** Update props  
**Lines Changed:** ~20  
**Priority:** 🟢 LOW  
**Phase:** 4.3

---

#### 33. `frontend/src/components/MemoryCard.vue`
**Current:** Display component  
**Changes:** Update props  
**Lines Changed:** ~20  
**Priority:** 🟢 LOW  
**Phase:** 4.4

---

#### 34. `frontend/src/components/layout/AppNavbar.vue`
**Current:** Uses auth store  
**Changes:** Ensure logout works with new auth  
**Lines Changed:** ~10  
**Priority:** 🟡 HIGH  
**Phase:** 3.3

---

### Environment Files (2 files)

#### 35. `frontend/.env`
**Current:** Has Laravel API URL + partial Supabase config  
**Changes:** Add actual Supabase anon key  
**Lines Changed:** ~5  
**Priority:** 🔴 CRITICAL  
**Phase:** 0.4

**Current:**
```env
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Updated:**
```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZ3hyZnl6YWtlaHNuaWZ5cG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwNDg4MDAsImV4cCI6MjA0MTYyNDgwMH0.XXXXXXXXXXXXXXXXXXXXXXX
```

---

#### 36. `frontend/.env.example`
**Current:** Template  
**Changes:** Remove Laravel references  
**Lines Changed:** ~5  
**Priority:** 🟢 LOW  
**Phase:** 9.2

---

### TypeScript Config (1 file)

#### 37. `frontend/tsconfig.json`
**Current:** Basic config  
**Changes:** May need path updates for new services  
**Lines Changed:** ~10  
**Priority:** 🟢 LOW  
**Phase:** 4.1

---

### Package Files (1 file)

#### 38. `frontend/package.json`
**Current:** Has `@supabase/supabase-js`  
**Changes:** Verify all dependencies present  
**Lines Changed:** ~5  
**Priority:** 🟢 LOW  
**Phase:** 4.1

---

### Supabase Config (1 file)

#### 39. `supabase/config.toml`
**Current:** Basic config  
**Changes:** Update URLs, add Edge Function settings  
**Lines Changed:** ~20  
**Priority:** 🟡 HIGH  
**Phase:** 7.1

---

### Database Types (1 file)

#### 40. `frontend/src/types/index.ts`
**Current:** Laravel-based types  
**Changes:** Update to match PostgreSQL schema  
**Lines Changed:** ~100  
**Priority:** 🟡 HIGH  
**Phase:** 4.1

---

### API Service (1 file - Optional)

#### 41. `frontend/src/services/api.service.ts`
**Current:** Axios instance with Sanctum  
**Changes:** **REMOVE or mark as deprecated**  
**Lines Changed:** N/A (delete or comment out)  
**Priority:** 🟢 LOW  
**Phase:** 4.1

**Note:** This file becomes obsolete with Supabase

---

### README (2 files)

#### 42. `README.md`
**Current:** Project readme  
**Changes:** Update architecture section  
**Lines Changed:** ~50  
**Priority:** 🟢 LOW  
**Phase:** 9.5

---

#### 43. `frontend/README.md`
**Current:** Frontend readme (if exists)  
**Changes:** Update setup instructions  
**Lines Changed:** ~30  
**Priority:** 🟢 LOW  
**Phase:** 9.5

---

### Git Ignore (1 file)

#### 44. `.gitignore`
**Current:** Standard ignores  
**Changes:** Add Supabase local files  
**Lines Changed:** ~5  
**Priority:** 🟢 LOW  
**Phase:** 1.1

**Add:**
```
# Supabase
.branches
.temp
```

---

#### 45. `frontend/src/lib/supabase.ts`
**Current:** Already exists  
**Changes:** Minor tweaks if needed  
**Lines Changed:** ~20  
**Priority:** 🟢 LOW  
**Phase:** 3.1

---

## 📊 SUMMARY STATISTICS

### Files to Create: 37 files
- Supabase Migrations: 5
- Frontend Services: 6
- Edge Functions: 3
- Scripts: 1
- TypeScript Types: 2
- Documentation: 12
- Environment Files: 2
- Vercel Config: 1
- GitHub Actions: 2 (optional)
- Test Files: 3

### Files to Modify: 45 files
- Authentication: 6
- Main App: 2
- Journal: 3
- Trips: 4
- Memories: 2
- Dashboard: 1
- Timeline: 1
- Search: 1
- Map: 1
- Profile & Settings: 2
- Tags & People: 2
- Time Capsules: 1
- Future Letters: 1
- Admin: 2
- Components: 5
- Environment: 2
- Config: 4
- Documentation: 2
- Other: 3

### Total Files Affected: 82 files

### Lines of Code:
- New Code: ~7,000 lines
- Modified Code: ~3,500 lines
- **Total:** ~10,500 lines

### File Size:
- SQL: ~2,800 lines
- TypeScript: ~5,500 lines
- Vue Components: ~2,000 lines
- Documentation: ~3,000 lines

---

## 🎯 PRIORITY BREAKDOWN

### 🔴 Critical Files (Must Create/Modify First)
- Database schema migration (Phase 1)
- RLS policies (Phase 1)
- Data migration script (Phase 2)
- Auth store & router (Phase 3)
- Journal service & pages (Phase 4)
- Trip service & pages (Phase 4)
- Media service (Phase 4)

### 🟡 High Priority (Important but can wait)
- Memory feature (Phase 4)
- Profile & Settings (Phase 5)
- Admin functions (Phase 6)
- Dashboard stats (Phase 4)

### 🟢 Medium/Low Priority (Nice to have)
- Edge Functions (Phase 7)
- Additional features (Phase 5)
- Documentation (Ongoing)
- Tests (Phase 8)

---

## ✅ VERIFICATION CHECKLIST

After modifying each file, verify:
- [ ] No TypeScript errors
- [ ] Imports resolve correctly
- [ ] Supabase queries have proper RLS
- [ ] User ID never comes from frontend
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Types match database schema

---

**This document provides a complete inventory of every file involved in the migration.**

**Next:** Start with Phase 0 of the main implementation plan.

---

**Version:** 1.0  
**Last Updated:** September 11, 2026  
**Total Files:** 82 (37 new, 45 modified)  
