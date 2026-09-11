# CRONEVIA Supabase Migration - Quick Start

Fast-track guide to get Cronevia running with Supabase authentication.

**Target**: 30 minutes from zero to working authentication

---

## Prerequisites Checklist

- [ ] Supabase account created (https://supabase.com)
- [ ] Node.js and npm installed
- [ ] Cronevia project cloned locally

---

## 5-Step Setup

### Step 1: Create Supabase Project (5 min)

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in:
   - Name: `cronevia`
   - Password: (save this!)
   - Region: (closest to you)
4. Wait for project to provision (1-2 minutes)
5. Go to **Settings** → **API** and copy:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJhbG...`

### Step 2: Run Database Scripts (5 min)

1. Open **SQL Editor** in Supabase dashboard
2. Copy contents of `database/supabase_schema.sql`
3. Paste and click **Run**
4. Create new query
5. Copy contents of `database/supabase_rls_policies.sql`
6. Paste and click **Run**

**Verify**: Go to **Table Editor**, you should see 17 tables

### Step 3: Configure Frontend (2 min)

```bash
cd frontend

# Create .env file
cp .env.example .env

# Edit .env and add your credentials
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbG...

# Install dependencies (if needed)
npm install
```

### Step 4: Create Super Admin (3 min)

1. In Supabase dashboard: **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - Email: `admin@cronevia.local`
   - Password: `Admin123!`
   - Auto Confirm: ✅ Yes
4. In **SQL Editor**, run:
   ```sql
   SELECT promote_to_super_admin('admin@cronevia.local');
   ```

**Verify**: Should return `SUCCESS: User promoted to Super Admin`

### Step 5: Test Authentication (15 min)

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

#### Test 1: Registration
1. Click **"Register"**
2. Create account: `test@example.com` / `Test1234!`
3. Should auto-login and redirect to home ✅

#### Test 2: Login
1. Logout
2. Login with test account
3. Should redirect to home ✅

#### Test 3: Protected Routes
1. Logout
2. Try visiting `/journal`
3. Should redirect to `/login` ✅

#### Test 4: Admin Access
1. Login as `admin@cronevia.local`
2. Visit `/admin`
3. Should see Admin Dashboard ✅
4. Logout and login as regular user
5. Try `/admin` → Should redirect to home ✅

---

## Quick Verification

Run this in Supabase SQL Editor:

```sql
-- Should return 17
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'user_settings', 'journal_entries', 
  'trips', 'trip_days', 'itinerary_items', 'memories', 
  'media', 'time_capsules', 'future_letters', 'tags', 
  'people', 'locations', 'audit_logs'
);

-- Should return 1 (your super admin)
SELECT COUNT(*) FROM profiles WHERE role = 'super_admin';

-- Should return true for all
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'journal_entries';
```

---

## Common Issues

### "Missing environment variables"
→ Check `.env` file has correct Supabase URL and anon key

### Profile not created on signup
→ Re-run `database/supabase_schema.sql` (includes trigger)

### Cannot access /admin as admin
→ Run `SELECT promote_to_super_admin('your-email');` again

### Registration fails
→ Check browser console, verify Supabase URL in `.env`

---

## Next Steps

✅ Authentication working  
→ Now migrate features one by one:
1. Journal (read, create, update, delete)
2. Trips (CRUD + itinerary)
3. Memories (CRUD + photos)
4. File uploads (Supabase Storage)

See `database/SUPABASE_SETUP_GUIDE.md` for detailed documentation.

---

## Architecture Achieved

```
Vue 3 Frontend (Port 5173)
        ↓
Supabase Client (@supabase/supabase-js)
        ↓
┌─────────────────────────────┐
│         SUPABASE            │
│                             │
│  ✅ Authentication          │
│  ✅ PostgreSQL (17 tables)  │
│  ✅ Row Level Security      │
│  ✅ Storage (ready)         │
│  ✅ Real-time (optional)    │
└─────────────────────────────┘
```

**Status**: ✅ Authentication layer complete and secure!
