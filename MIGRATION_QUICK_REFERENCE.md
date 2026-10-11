# CRONEVIA SUPABASE MIGRATION - QUICK REFERENCE

**Last Updated:** September 11, 2026  
**Full Plan:** See `SUPABASE_MIGRATION_IMPLEMENTATION_PLAN.md`

---

## 🚀 QUICK START

### Current Status
```
✅ Supabase project created (lrgxrfyzakehsnifypmd)
✅ Frontend has Supabase client configured
✅ Backend still running (Laravel + MySQL)
⚠️  Production data: 3 users, 2 journals
🎯 Goal: Migrate to 100% Supabase
```

### Critical First Steps

1. **Get Supabase Anon Key**
   - Visit: https://supabase.com/dashboard/project/lrgxrfyzakehsnifypmd
   - Settings → API → Copy anon/public key
   - Update: `frontend/.env`

2. **Backup Everything**
   ```bash
   cd backend
   php artisan db:dump
   git add -A && git commit -m "Pre-migration backup"
   ```

3. **Start Migration**
   - Begin with Phase 0 from main plan
   - Complete phases sequentially
   - Test thoroughly between phases

---

## 📋 PHASES AT A GLANCE

| Phase | Focus | Duration | Critical? |
|-------|-------|----------|-----------|
| 0 | Backup & Prep | 2 hours | 🔴 YES |
| 1 | Database Schema | 8-10 hours | 🔴 YES |
| 2 | Data Migration | 4-5 hours | 🔴 YES |
| 3 | Authentication | 6-8 hours | 🔴 YES |
| 4 | Core Features | 16-20 hours | 🔴 YES |
| 5 | Additional Features | 12-16 hours | 🟡 HIGH |
| 6 | Super Admin | 6-8 hours | 🟡 HIGH |
| 7 | Edge Functions | 6-8 hours | 🟢 MED |
| 8 | Testing | 10-12 hours | 🔴 YES |
| 9 | Deployment | 3-4 hours | 🔴 YES |
| 10 | Backend Cleanup | Optional | 🟢 LOW |

**Total:** 3-4 weeks (20 hrs/week)

---

## 📂 FILES TO CREATE

### Supabase Migrations
```
supabase/migrations/
├── 20260911000001_complete_schema.sql      ← All tables
├── 20260911000002_rls_policies.sql         ← Security policies
├── 20260911000003_storage_setup.sql        ← Buckets & policies
├── 20260911000004_helper_functions.sql     ← SQL functions
└── 20260911000005_admin_functions.sql      ← Admin RPC
```

### Frontend Services
```
frontend/src/services/supabase/
├── journal.service.ts
├── trip.service.ts
├── memory.service.ts
├── media.service.ts
├── profile.service.ts
└── admin.service.ts
```

### Edge Functions
```
supabase/functions/
├── location-search/index.ts
├── send-future-letter/index.ts
└── weather-lookup/index.ts
```

### Scripts
```
scripts/
└── migrate_data_to_supabase.js
```

---

## 📝 FILES TO MODIFY

### High Priority (Phase 3-4)

**Authentication:**
```
frontend/src/stores/auth.ts                 ← Replace Laravel with Supabase
frontend/src/router/index.ts                ← Update route guards
frontend/src/pages/LoginPage.vue            ← Supabase login
frontend/src/pages/RegisterPage.vue         ← Supabase register
frontend/src/pages/ForgotPasswordPage.vue   ← Create if missing
frontend/src/pages/ResetPasswordPage.vue    ← Create if missing
```

**Core Features:**
```
frontend/src/pages/JournalPage.vue          ← Replace API calls
frontend/src/pages/JournalEditorPage.vue    ← Replace API calls
frontend/src/stores/journal.ts              ← New Supabase queries
frontend/src/pages/TripsPage.vue            ← Replace API calls
frontend/src/pages/TripDetailPage.vue       ← Replace API calls
frontend/src/pages/TripCreatePage.vue       ← Replace API calls
frontend/src/stores/trips.ts                ← New Supabase queries
frontend/src/pages/MemoriesPage.vue         ← Replace API calls
frontend/src/stores/memories.ts             ← New Supabase queries
```

### Medium Priority (Phase 5-6)

**Additional Features:**
```
frontend/src/pages/HomePage.vue             ← Dashboard stats
frontend/src/pages/OnThisDayPage.vue        ← Timeline queries
frontend/src/pages/SearchPage.vue           ← Search queries
frontend/src/pages/MapPage.vue              ← Location queries
frontend/src/pages/ProfilePage.vue          ← Profile updates
frontend/src/pages/SettingsPage.vue         ← Settings updates
```

**Admin:**
```
frontend/src/pages/admin/AdminDashboard.vue ← Admin RPC calls
frontend/src/pages/admin/UserManagement.vue ← Admin RPC calls
```

---

## 🔐 SECURITY CHECKLIST

### Must-Have Policies (Task 1.2)

For EVERY user table:
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can create own data"
  ON table_name FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

Apply to:
- ✅ profiles
- ✅ user_settings
- ✅ journal_entries
- ✅ trips
- ✅ trip_days (via trip relationship)
- ✅ itinerary_items (via trip relationship)
- ✅ memories
- ✅ media
- ✅ locations
- ✅ time_capsules
- ✅ future_letters
- ✅ tags
- ✅ people
- ✅ All pivot tables

### Storage Policies

```sql
-- Example: journal-photos bucket
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'journal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users view own photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'journal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'journal-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 🧪 CRITICAL TESTS

### Security Testing

**Test 1: User Isolation**
```bash
# Create User A: usera@test.com
# Create User B: userb@test.com
# User A creates journal
# Login as User B
# Try to view User A's journal
# Expected: Should NOT see it
```

**Test 2: Direct SQL Attempt**
```sql
-- As User B, try to query User A's data
SELECT * FROM journal_entries WHERE user_id = '<user-a-id>';
-- Expected: Empty result (RLS blocks it)
```

**Test 3: Storage Access**
```bash
# User A uploads photo
# Get photo URL
# Logout, try to access URL
# Expected: 403 Forbidden
```

### Feature Testing

**Checklist:**
- [ ] Register new user
- [ ] Login works
- [ ] Create journal
- [ ] Edit journal
- [ ] Upload photo
- [ ] Archive journal
- [ ] Restore journal
- [ ] Delete journal
- [ ] Create trip
- [ ] Add destination
- [ ] Upload trip photo
- [ ] Create memory
- [ ] Update profile
- [ ] Change password
- [ ] Admin can view users (super admin only)
- [ ] Regular user CANNOT access admin

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: "Missing Supabase URL or Key"
```
Error: Missing Supabase environment variables
```
**Solution:** 
- Check `frontend/.env`
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server: `npm run dev`

---

### Issue 2: "Row-level security policy violation"
```
Error: new row violates row-level security policy
```
**Solution:**
- Check RLS policy allows the operation
- Verify `auth.uid()` matches `user_id`
- Don't manually set `user_id` in frontend - let Supabase handle it

---

### Issue 3: "Permission denied for storage object"
```
Error: The resource already exists
```
**Solution:**
- Check storage policies
- Verify file path includes user ID: `{user_id}/{filename}`
- Ensure user is authenticated

---

### Issue 4: Users Can't Login After Migration
```
Error: Invalid login credentials
```
**Solution:**
- Users need to reset passwords after migration
- Send password reset emails (Task 2.4)
- Temporary issue during migration only

---

### Issue 5: Build Fails with TypeScript Errors
```
Error: Property 'xxx' does not exist on type 'yyy'
```
**Solution:**
- Update TypeScript types to match PostgreSQL schema
- Check `frontend/src/types/database.types.ts`
- Run `supabase gen types typescript` to auto-generate

---

### Issue 6: Photos Not Loading
```
Error: Failed to load resource: 403 Forbidden
```
**Solution:**
- Check storage bucket policies
- Verify bucket is public or has proper RLS
- Check file path structure
- Verify user owns the photo

---

## 💡 HELPFUL COMMANDS

### Supabase CLI

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset database (apply all migrations)
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > frontend/src/types/database.types.ts

# Link to remote project
supabase link --project-ref lrgxrfyzakehsnifypmd

# Push migrations to remote
supabase db push

# Deploy Edge Function
supabase functions deploy function-name

# View logs
supabase functions logs function-name
```

### Laravel (During Migration)

```bash
# Apply pending migrations
cd backend
php artisan migrate

# Check migration status
php artisan migrate:status

# Dump database
php artisan db:dump

# Check user count
php artisan tinker --execute="echo User::count();"
```

### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

### Git

```bash
# Backup before migration
git add -A
git commit -m "Pre-migration backup"
git tag v1.0-pre-migration

# After migration success
git add -A
git commit -m "Migration to Supabase complete"
git tag v2.0-supabase
```

---

## 📊 MIGRATION PROGRESS TRACKER

Use this to track your progress:

### Phase 0: Pre-Migration ⬜
- [ ] Task 0.1: Backup Everything
- [ ] Task 0.2: Apply Pending Migrations
- [ ] Task 0.3: Export Data Structure
- [ ] Task 0.4: Get Supabase Anon Key

### Phase 1: Database Setup ⬜
- [ ] Task 1.1: Create Schema
- [ ] Task 1.2: Implement RLS
- [ ] Task 1.3: Setup Storage
- [ ] Task 1.4: Create Functions
- [ ] Task 1.5: Test Schema

### Phase 2: Data Migration ⬜
- [ ] Task 2.1: Create Migration Script
- [ ] Task 2.2: Handle Passwords
- [ ] Task 2.3: Execute Migration
- [ ] Task 2.4: Send Password Resets

### Phase 3: Authentication ⬜
- [ ] Task 3.1: Update Auth Store
- [ ] Task 3.2: Update Router Guards
- [ ] Task 3.3: Update Auth Pages
- [ ] Task 3.4: Add Session Persistence
- [ ] Task 3.5: Test Auth Flow

### Phase 4: Core Features ⬜
- [ ] Task 4.1: Create Service Layer
- [ ] Task 4.2: Migrate Journal
- [ ] Task 4.3: Migrate Trips
- [ ] Task 4.4: Migrate Memories
- [ ] Task 4.5: Migrate Media
- [ ] Task 4.6: Migrate Dashboard

### Phase 5: Additional Features ⬜
- [ ] Task 5.1: Timeline
- [ ] Task 5.2: Search
- [ ] Task 5.3: Tags & People
- [ ] Task 5.4: Locations & Map
- [ ] Task 5.5: Time Capsules
- [ ] Task 5.6: Future Letters
- [ ] Task 5.7: Profile & Settings

### Phase 6: Super Admin ⬜
- [ ] Task 6.1: Admin RPC Functions
- [ ] Task 6.2: Update Admin Frontend
- [ ] Task 6.3: Create Super Admin

### Phase 7: Edge Functions ⬜
- [ ] Task 7.1: Setup Functions
- [ ] Task 7.2: Location Search
- [ ] Task 7.3: Future Letters Email
- [ ] Task 7.4: Weather Lookup

### Phase 8: Testing ⬜
- [ ] Task 8.1: Security Testing
- [ ] Task 8.2: Feature Testing
- [ ] Task 8.3: Performance Testing
- [ ] Task 8.4: Cross-Browser Testing

### Phase 9: Deployment ⬜
- [ ] Task 9.1: Deploy to Supabase
- [ ] Task 9.2: Configure Frontend .env
- [ ] Task 9.3: Build Frontend
- [ ] Task 9.4: Deploy to Vercel
- [ ] Task 9.5: Verify Production

### Phase 10: Backend Cleanup ⬜
- [ ] Task 10.1: Monitor Usage
- [ ] Task 10.2: Archive Backend

---

## 🎯 WHEN TO ASK FOR HELP

Contact if you encounter:

1. **RLS Policy Errors** - Policies can be tricky
2. **Migration Script Issues** - Data migration is critical
3. **Build Errors** - TypeScript type mismatches
4. **Deployment Failures** - Vercel configuration issues
5. **Performance Problems** - Query optimization needed
6. **Security Concerns** - Better safe than sorry

---

## ✅ SUCCESS CRITERIA

Migration is complete when:

✅ All 3 users can log in  
✅ All 2 journals visible  
✅ New content creation works  
✅ Photos upload successfully  
✅ User isolation verified (RLS working)  
✅ Admin functions work  
✅ Build succeeds  
✅ Production deployment live  
✅ No console errors  
✅ Mobile responsive  

---

## 📚 DOCUMENTATION LINKS

- **Full Plan:** `SUPABASE_MIGRATION_IMPLEMENTATION_PLAN.md`
- **Supabase Docs:** https://supabase.com/docs
- **Vue 3 Docs:** https://vuejs.org/
- **Vite Docs:** https://vitejs.dev/

---

## 🚀 READY TO START?

1. Read the full implementation plan
2. Start with Phase 0
3. Complete phases sequentially
4. Test thoroughly
5. Deploy with confidence

**You've got this!** 💪

The full detailed plan is in `SUPABASE_MIGRATION_IMPLEMENTATION_PLAN.md`.

---

**Version:** 1.0  
**Last Updated:** September 11, 2026  
**Status:** Ready for Action  
