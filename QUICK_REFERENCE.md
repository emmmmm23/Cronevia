# 🚀 CRONEVIA Quick Reference

## Your Supabase Project

**Project ID**: `lrgxrfyzakehsnifypmd`  
**Region**: `ap-northeast-1` (Tokyo)  
**URL**: `https://lrgxrfyzakehsnifypmd.supabase.co`  
**Dashboard**: https://app.supabase.com/project/lrgxrfyzakehsnifypmd

---

## 📁 Important Files

### Database
- `database/supabase_schema.sql` - Run this first
- `database/supabase_rls_policies.sql` - Run this second

### Frontend Config
- `frontend/.env` - Add your anon key here
- `frontend/src/lib/supabase.ts` - Supabase client
- `frontend/src/stores/auth.ts` - Authentication logic

### Documentation
- `SETUP_INSTRUCTIONS.md` - Start here! ⭐
- `SUPABASE_MIGRATION_QUICKSTART.md` - 30-min setup
- `AUTHENTICATION_TESTING_CHECKLIST.md` - Testing guide
- `AUTHENTICATION_MIGRATION_COMPLETE.md` - Full summary

---

## ⚡ Quick Commands

### Start Development
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

### Install Dependencies (if needed)
```bash
cd frontend
npm install
```

### Build for Production
```bash
cd frontend
npm run build
```

---

## 🔑 Get Your Anon Key

1. Go to: https://app.supabase.com/project/lrgxrfyzakehsnifypmd/settings/api
2. Copy the **anon/public** key
3. Add to `frontend/.env`:
   ```env
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```

---

## 📊 Run Database Scripts

### In Supabase SQL Editor:

**Step 1 - Schema:**
```sql
-- Copy contents of database/supabase_schema.sql
-- Paste and run
```

**Step 2 - RLS Policies:**
```sql
-- Copy contents of database/supabase_rls_policies.sql
-- Paste and run
```

**Step 3 - Create Super Admin:**
```sql
SELECT promote_to_super_admin('your-email@example.com');
```

---

## ✅ Verify Setup

### Check Tables Created:
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Should return 17+
```

### Check RLS Enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
-- rowsecurity should be true
```

### Check Super Admin:
```sql
SELECT u.email, p.role 
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE p.role = 'super_admin';
-- Should show your admin email
```

---

## 🧪 Quick Tests

### Test Registration:
1. Visit: http://localhost:5173/register
2. Register: `test@example.com` / `Test1234!`
3. Should auto-login ✅

### Test Login:
1. Visit: http://localhost:5173/login
2. Login with test account
3. Should redirect to home ✅

### Test Protected Routes:
1. Logout
2. Try: http://localhost:5173/journal
3. Should redirect to login ✅

### Test Admin:
1. Login as admin
2. Visit: http://localhost:5173/admin
3. Should see admin dashboard ✅

---

## 🎨 Design Colors

Cronevia vintage aesthetic:
- **Background**: `#FFF8F0` (Cream)
- **Primary**: `#8B4513` (Saddle Brown)
- **Accent**: `#C41E3A` (Crimson Red)
- **Border**: `#D4A574` (Tan)

---

## 📋 Routes

### Supabase CLI Commands (If Using CLI)

```bash
# Link to your project
supabase link --project-ref lrgxrfyzakehsnifypmd

# Create new migration
supabase migration new migration_name

# Apply migrations to remote
supabase db push

# Pull remote schema
supabase db pull

# List all migrations
supabase migration list

# Check remote tables
supabase db remote ls
```

**Using CLI?** See: `CLI_QUICK_START.md` or `SUPABASE_CLI_GUIDE.md`

---

## 📋 Routes

### Public
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Reset password form

### Protected (Require Login)
- `/journal` - Journal entries
- `/trips` - Travel trips
- `/memories` - Memories
- `/profile` - User profile
- `/settings` - Settings

### Admin Only
- `/admin` - Admin dashboard

---

## 🔒 Security Checklist

- ✅ RLS enabled on all tables
- ✅ Users can only see their own data
- ✅ Cannot self-promote to admin
- ✅ anon key in frontend (safe)
- ❌ service_role key NOT in frontend

---

## 🐛 Common Issues

**"Missing environment variables"**
→ Add anon key to `frontend/.env`

**Tables not found**
→ Run `supabase_schema.sql` in SQL Editor

**Cannot login**
→ Check browser console
→ Verify `.env` settings

**Profile not created**
→ Re-run schema SQL (includes trigger)

**Admin access denied**
→ Run promote_to_super_admin query

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vue 3 Docs**: https://vuejs.org/
- **Tailwind CSS**: https://tailwindcss.com/

---

## 🎯 Next Steps

1. ✅ Get anon key from Supabase
2. ✅ Update `frontend/.env`
3. ✅ Run database scripts
4. ✅ Create super admin
5. ✅ Test authentication
6. ✅ Follow full testing checklist
7. ✅ Ready for Phase 2!

---

**Status**: ✅ Ready for setup  
**Time to complete**: ~15 minutes  
**Next**: Follow `SETUP_INSTRUCTIONS.md`
