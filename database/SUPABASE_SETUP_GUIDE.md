# CRONEVIA Supabase Setup Guide

Complete guide for setting up the Cronevia database on Supabase.

**Date**: September 10, 2026  
**Status**: Ready for deployment  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
3. [Step 2: Run Schema Migration](#step-2-run-schema-migration)
4. [Step 3: Enable Row Level Security](#step-3-enable-row-level-security)
5. [Step 4: Configure Storage](#step-4-configure-storage)
6. [Step 5: Configure Frontend](#step-5-configure-frontend)
7. [Step 6: Create Super Admin](#step-6-create-super-admin)
8. [Step 7: Test Authentication](#step-7-test-authentication)
9. [Verification Checklist](#verification-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ A Supabase account (sign up at https://supabase.com)
- ✅ Access to your Supabase project dashboard
- ✅ Database SQL editor access
- ✅ Node.js and npm installed locally
- ✅ The Cronevia project cloned

---

## Step 1: Create Supabase Project

### 1.1 Sign Up / Log In

1. Go to https://app.supabase.com
2. Sign in or create a new account
3. Click **"New Project"**

### 1.2 Project Configuration

Fill in the project details:

- **Name**: `cronevia` (or your preferred name)
- **Database Password**: Choose a strong password (save this!)
- **Region**: Select the region closest to your users
- **Pricing Plan**: Free tier is sufficient for development

Click **"Create new project"** and wait 1-2 minutes for provisioning.

### 1.3 Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Note down these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (this is safe for frontend)
   - ⚠️ **DO NOT expose the service_role key** in frontend!

---

## Step 2: Run Schema Migration

### 2.1 Open SQL Editor

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**

### 2.2 Run the Schema Script

1. Open the file: `database/supabase_schema.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **"Run"** (or press Ctrl/Cmd + Enter)

**Expected Output**: 
```
Success. No rows returned
```

### 2.3 Verify Tables Created

1. Go to **Table Editor** in the sidebar
2. You should see 17 tables:
   - ✅ profiles
   - ✅ user_settings
   - ✅ locations
   - ✅ trips
   - ✅ trip_days
   - ✅ itinerary_items
   - ✅ memories
   - ✅ journal_entries
   - ✅ media
   - ✅ time_capsules
   - ✅ time_capsule_items
   - ✅ future_letters
   - ✅ tags
   - ✅ people
   - ✅ audit_logs
   - Plus 6 pivot tables (journal_entry_tag, memory_tag, etc.)

---

## Step 3: Enable Row Level Security

### 3.1 Run RLS Policies Script

1. In **SQL Editor**, create another new query
2. Open the file: `database/supabase_rls_policies.sql`
3. Copy the entire contents
4. Paste into the Supabase SQL Editor
5. Click **"Run"**

**Expected Output**: 
```
Success. No rows returned
```

### 3.2 Verify RLS is Enabled

1. Go to **Authentication** → **Policies**
2. Select each table and verify:
   - ✅ RLS is enabled (toggle should be ON)
   - ✅ Policies are listed (multiple policies per table)

Example for `journal_entries`:
- Users can view own journal entries
- Users can create own journal entries
- Users can update own journal entries
- Users can delete own journal entries
- Super Admin can view all journal entries

---

## Step 4: Configure Storage

### 4.1 Create Storage Buckets

1. Go to **Storage** in the sidebar
2. Click **"Create bucket"**

Create these three buckets:

#### Bucket 1: avatars
- **Name**: `avatars`
- **Public**: ✅ Yes
- **File size limit**: 2 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

#### Bucket 2: journal-photos
- **Name**: `journal-photos`
- **Public**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

#### Bucket 3: trip-photos
- **Name**: `trip-photos`
- **Public**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

### 4.2 Configure Storage Policies

For each private bucket (`journal-photos` and `trip-photos`):

1. Click the bucket name
2. Go to **Policies** tab
3. Add these policies:

**Policy: Users can upload their own photos**
```sql
-- INSERT policy
(bucket_id = 'journal-photos' AND 
 (storage.foldername(name))[1] = auth.uid()::text)
```

**Policy: Users can view their own photos**
```sql
-- SELECT policy
(bucket_id = 'journal-photos' AND 
 (storage.foldername(name))[1] = auth.uid()::text)
```

**Policy: Users can delete their own photos**
```sql
-- DELETE policy
(bucket_id = 'journal-photos' AND 
 (storage.foldername(name))[1] = auth.uid()::text)
```

Repeat for `trip-photos` bucket (replace `journal-photos` with `trip-photos`).

---

## Step 5: Configure Frontend

### 5.1 Update Environment Variables

1. Go to `frontend/` directory
2. Copy `.env.example` to `.env`:
   ```bash
   cd frontend
   cp .env.example .env
   ```

3. Edit `.env` and add your Supabase credentials:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   
   # Legacy Laravel API (optional during migration)
   VITE_API_URL=http://localhost:8000
   ```

### 5.2 Install Dependencies (if not done already)

```bash
npm install
```

### 5.3 Verify Supabase Client

Check that the Supabase client is configured:

```bash
# Should show @supabase/supabase-js in the list
npm list @supabase/supabase-js
```

---

## Step 6: Create Super Admin

### 6.1 Register First User

**IMPORTANT**: Create the Super Admin account BEFORE allowing public registrations.

#### Option A: Through Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: your-admin-email@example.com
   - **Password**: Strong password (12+ characters)
   - **Auto Confirm Email**: ✅ Yes
4. Click **"Create user"**
5. Copy the User ID (UUID)

#### Option B: Through Frontend Registration

1. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open http://localhost:5173
3. Click **"Register"**
4. Fill in the form with admin details
5. Complete registration

### 6.2 Promote User to Super Admin

In **SQL Editor**, run:

```sql
-- Replace 'admin@example.com' with your actual admin email
SELECT promote_to_super_admin('admin@example.com');
```

**Expected Output**:
```
SUCCESS: User promoted to Super Admin: admin@example.com
```

### 6.3 Verify Super Admin Role

```sql
-- Check the admin's profile
SELECT user_id, full_name, role, account_status
FROM profiles
WHERE role = 'super_admin';
```

You should see one row with `role = 'super_admin'`.

### 6.4 Test Admin Access

1. Log in with the admin credentials
2. Navigate to `/admin` route
3. You should see the Admin Dashboard
4. Regular users should be redirected away from `/admin`

---

## Step 7: Test Authentication

### 7.1 Start Development Server

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

### 7.2 Test Registration

1. Click **"Register"**
2. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: Test1234!
3. Click **"Create Account"**

**Expected Result**: 
- ✅ Account created
- ✅ Automatically logged in (or email confirmation message shown)
- ✅ Redirected to home page

### 7.3 Verify Profile Created

In Supabase SQL Editor:

```sql
-- Check if profile was auto-created
SELECT * FROM profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
```

Should show:
- ✅ Profile exists
- ✅ `role = 'user'` (NOT super_admin)
- ✅ `account_status = 'active'`

### 7.4 Test Login

1. Click **"Logout"**
2. Click **"Login"**
3. Enter credentials
4. Click **"Sign In"**

**Expected Result**:
- ✅ Successfully logged in
- ✅ Redirected to home page
- ✅ User data loaded in auth store

### 7.5 Test Protected Routes

**When Logged Out**:
- Try visiting `/journal` → Should redirect to `/login` ✅
- Try visiting `/trips` → Should redirect to `/login` ✅

**When Logged In (as regular user)**:
- Try visiting `/journal` → Should show journal page ✅
- Try visiting `/admin` → Should redirect to `/` (not authorized) ✅

**When Logged In (as super admin)**:
- Try visiting `/admin` → Should show admin dashboard ✅

### 7.6 Test Password Reset

1. Log out
2. Click **"Forgot your password?"**
3. Enter your email
4. Click **"Send Reset Link"**
5. Check your email inbox
6. Click the reset link
7. Enter new password
8. Confirm password reset works

---

## Verification Checklist

Before deploying to production, verify:

### Database
- ✅ All 17 tables created
- ✅ Indexes created
- ✅ Foreign keys established
- ✅ Triggers working (updated_at auto-updates)
- ✅ Auto-create profile trigger works

### Security
- ✅ RLS enabled on all tables
- ✅ RLS policies preventing unauthorized access
- ✅ Normal users CANNOT promote themselves to super_admin
- ✅ Storage policies protect user files
- ✅ Anon key exposed in frontend (safe with RLS)
- ✅ Service role key NEVER in frontend

### Authentication
- ✅ Registration works
- ✅ Login works
- ✅ Logout works
- ✅ Password reset works
- ✅ Profile auto-created on signup
- ✅ Session persists across page refreshes
- ✅ Auth state listener working

### Authorization
- ✅ Protected routes require login
- ✅ Guest routes redirect authenticated users
- ✅ Admin routes require super_admin role
- ✅ Regular users cannot access admin pages
- ✅ Suspended accounts cannot log in

### User Isolation (CRITICAL)
- ✅ User A cannot read User B's journals
- ✅ User A cannot modify User B's trips
- ✅ User A cannot delete User B's photos
- ✅ User A cannot see User B's profile data

Test this manually:
1. Create User A
2. Create some journal entries for User A
3. Log out and create User B
4. Try to access User A's data → Should fail ✅

---

## Troubleshooting

### Issue: "Missing environment variables" error

**Cause**: `.env` file not configured

**Fix**:
1. Copy `.env.example` to `.env`
2. Add your Supabase URL and anon key
3. Restart the dev server

### Issue: Profile not auto-created on signup

**Cause**: Trigger not working or not installed

**Fix**:
```sql
-- Verify trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If missing, re-run the schema SQL
-- (database/supabase_schema.sql)
```

### Issue: Cannot access own data after login

**Cause**: RLS policies not applied

**Fix**:
1. Go to **Authentication** → **Policies**
2. Verify RLS is enabled on the table
3. Re-run `supabase_rls_policies.sql`

### Issue: "User cannot modify role" when updating profile

**Cause**: RLS policy working correctly (this is expected!)

**Explanation**: Users are prevented from changing their own role. This is a security feature, not a bug.

### Issue: Password reset email not received

**Possible causes**:
1. Email in spam folder
2. Supabase email settings not configured
3. Development mode (check Supabase logs)

**Fix**:
1. Check **Authentication** → **Email Templates**
2. Verify SMTP settings or use Supabase default
3. In development, copy reset link from Supabase logs

### Issue: Super admin cannot access admin pages

**Fix**:
```sql
-- Verify role in database
SELECT user_id, full_name, role FROM profiles WHERE user_id = 'your-user-id';

-- If role is not 'super_admin', update it
UPDATE profiles SET role = 'super_admin' WHERE user_id = 'your-user-id';
```

### Issue: Storage upload fails

**Cause**: Storage policies not configured

**Fix**:
1. Verify bucket exists
2. Check bucket is not public (for private files)
3. Add storage policies (see Step 4.2)

---

## Next Steps

After authentication is working:

1. ✅ **Test thoroughly** - Create multiple test users
2. ✅ **Migrate journal features** - Replace Laravel API calls with Supabase queries
3. ✅ **Migrate trip features** - Replace Laravel API calls with Supabase queries
4. ✅ **Implement file uploads** - Use Supabase Storage
5. ✅ **Deploy to Vercel** - Configure production environment variables
6. ✅ **Monitor production** - Set up error tracking and logging

---

## Security Reminders

### ✅ DO:
- Use the anon key in frontend (it's safe with RLS)
- Keep the service_role key secret
- Enable RLS on all tables
- Test user isolation thoroughly
- Use strong passwords for admin accounts
- Monitor audit logs regularly

### ❌ DON'T:
- Expose service_role key in frontend
- Disable RLS in production
- Trust client-side data without validation
- Allow users to set their own roles
- Store passwords in profiles table
- Make all storage buckets public

---

## Support

If you encounter issues:

1. Check the Supabase logs: **Logs** → **Postgres Logs**
2. Check browser console for errors
3. Verify environment variables are correct
4. Review RLS policies in SQL Editor
5. Test with Supabase's built-in testing tools

---

**Setup Complete!** 🎉

Your Cronevia database is now running on Supabase with proper security and authentication.
