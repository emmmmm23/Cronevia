# 🚀 CRONEVIA Setup Instructions

Your Supabase project is ready! Follow these steps to complete the setup.

---

## ✅ What's Already Done

- ✅ Project ID: `lrgxrfyzakehsnifypmd`
- ✅ Region: `ap-northeast-1` (Tokyo)
- ✅ Supabase URL configured in `.env`
- ✅ All code files created and ready

---

## 📋 Step-by-Step Setup (15 minutes)

### Step 1: Get Your Anon Key (2 min)

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select project: `lrgxrfyzakehsnifypmd`
3. Go to **Settings** (gear icon) → **API**
4. Find **Project API keys** section
5. Copy the **anon** / **public** key (starts with `eyJhbG...`)
6. Open `frontend/.env` and replace `your-anon-key-here` with the actual key

**Your .env should look like:**
```env
VITE_SUPABASE_URL=https://lrgxrfyzakehsnifypmd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

---

### Step 2: Run Database Schema (5 min)

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file: `database/supabase_schema.sql` (in your project)
4. Copy ALL contents (Ctrl+A, Ctrl+C)
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)

**Expected:** ✅ "Success. No rows returned"

**Verify:** Go to **Table Editor** → You should see 17 tables

---

### Step 3: Enable Row Level Security (3 min)

1. In Supabase SQL Editor, click **New query**
2. Open the file: `database/supabase_rls_policies.sql`
3. Copy ALL contents
4. Paste into Supabase SQL Editor
5. Click **Run**

**Expected:** ✅ "Success. No rows returned"

**Verify:** Go to **Authentication** → **Policies** → Select any table → RLS should be enabled

---

### Step 4: Start the App (2 min)

```bash
cd frontend
npm run dev
```

Open: http://localhost:5173

**You should see:** Cronevia landing page with vintage design

---

### Step 5: Create Super Admin (3 min)

#### Option A: Register Through App
1. Click **"Create one"** or go to http://localhost:5173/register
2. Register with:
   - Name: `Admin User`
   - Email: `admin@cronevia.local`
   - Password: `Admin123!`
3. Note: You'll be registered as a regular user first

#### Option B: Create in Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Email: `admin@cronevia.local`
4. Password: `Admin123!`
5. Toggle **Auto Confirm Email**: ✅ ON
6. Click **Create user**

#### Promote to Super Admin
1. In Supabase dashboard, go to **SQL Editor**
2. Run this query:
```sql
SELECT promote_to_super_admin('admin@cronevia.local');
```

**Expected:** ✅ "SUCCESS: User promoted to Super Admin"

**Verify:**
```sql
SELECT email, role FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'super_admin';
```

Should show your admin email.

---

## ✅ Test Authentication (5 min)

### Test 1: Registration
1. Go to http://localhost:5173/register
2. Register: `test@example.com` / `Test1234!`
3. Should auto-login and redirect to home ✅

### Test 2: Login
1. Logout (if logged in)
2. Go to http://localhost:5173/login
3. Login with `test@example.com` / `Test1234!`
4. Should redirect to home ✅

### Test 3: Protected Routes
1. Logout
2. Try to visit: http://localhost:5173/journal
3. Should redirect to login ✅

### Test 4: Admin Access
1. Login as `admin@cronevia.local`
2. Visit: http://localhost:5173/admin
3. Should see **"Super Admin Dashboard"** ✅
4. Logout and login as regular user
5. Try `/admin` → Should redirect to home ✅

---

## 🎉 Success!

If all 4 tests pass, your authentication is working perfectly!

---

## 🔧 Troubleshooting

### "Missing environment variables"
→ Make sure you copied the anon key to `frontend/.env`
→ Restart dev server after changing `.env`

### Tables not created
→ Re-run `database/supabase_schema.sql`
→ Check for error messages in SQL Editor

### Cannot login
→ Check browser console for errors
→ Verify Supabase URL and anon key in `.env`
→ Make sure RLS policies are applied

### Profile not created on signup
→ Verify trigger exists:
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
→ If missing, re-run schema SQL

### Admin cannot access /admin
→ Run promote query again
→ Check role:
```sql
SELECT role FROM profiles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@cronevia.local'
);
```

---

## 📚 Documentation

For detailed information, see:

1. **Quick Start**: `SUPABASE_MIGRATION_QUICKSTART.md`
2. **Full Setup Guide**: `database/SUPABASE_SETUP_GUIDE.md`
3. **Testing Checklist**: `AUTHENTICATION_TESTING_CHECKLIST.md`
4. **Migration Summary**: `AUTHENTICATION_MIGRATION_COMPLETE.md`

---

## 🎯 What's Next?

After authentication is working:

1. ✅ Test thoroughly (use AUTHENTICATION_TESTING_CHECKLIST.md)
2. ✅ Create a few test users
3. ✅ Verify user isolation (User A can't see User B's data)
4. ✅ Ready for Phase 2: Migrate Journal features

---

## 🔑 Important Security Notes

✅ **anon key is SAFE** to use in frontend (RLS protects data)  
❌ **service_role key** should NEVER be in frontend  
✅ **All user data** is protected by Row Level Security  
✅ **Users cannot** change their own role  
✅ **Only one** Super Admin allowed  

---

## 📞 Need Help?

Check the troubleshooting section above or review:
- Supabase logs: **Logs** → **Postgres Logs**
- Browser console for frontend errors
- Verify all environment variables

---

**Your Supabase Configuration:**
```
Project ID: lrgxrfyzakehsnifypmd
Region: ap-northeast-1 (Tokyo)
URL: https://lrgxrfyzakehsnifypmd.supabase.co
```

**Ready to go!** 🚀
