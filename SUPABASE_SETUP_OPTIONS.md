# 🚨 Supabase CLI Error - Here's the Fix

## The Error: `supabase: command not found`

**Problem**: Supabase CLI is not installed on your system.

**Solution**: You have 2 options (pick the easier one for you)

---

## ✅ OPTION 1: Use Supabase Dashboard (EASIEST - Recommended)

**Skip the CLI entirely and use the web interface**

### Step 1: Go to SQL Editor
https://app.supabase.com/project/lrgxrfyzakehsnifypmd/sql/new

### Step 2: Run Schema Script
1. Open file: `database/supabase_schema.sql`
2. Copy **ALL** contents (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor
4. Click **"Run"** (or Ctrl+Enter)

**Expected**: ✅ "Success. No rows returned"

### Step 3: Run RLS Policies Script
1. Click **"New query"**
2. Open file: `database/supabase_rls_policies.sql`
3. Copy **ALL** contents
4. Paste into SQL Editor
5. Click **"Run"**

**Expected**: ✅ "Success. No rows returned"

### Step 4: Verify Tables Created
1. Go to **Table Editor** (left sidebar)
2. You should see 17 tables:
   - profiles
   - user_settings
   - journal_entries
   - trips
   - memories
   - media
   - locations
   - tags
   - people
   - etc.

**That's it!** ✅ Your database is ready!

---

## ✅ OPTION 2: Install Supabase CLI (For Advanced Users)

### Install via npm (Easiest)

```powershell
npm install -g supabase
```

### Or Install via Scoop

```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Then Link Your Project

```powershell
cd "C:\Users\Juan Miguel\Cronevia"
supabase link --project-ref lrgxrfyzakehsnifypmd
```

Enter your database password when prompted.

### Create and Apply Migrations

```powershell
# Create migration file
supabase migration new initial_schema

# Copy database/supabase_schema.sql into the new migration file
# Then run:
supabase db push
```

---

## 🎯 WHICH OPTION SHOULD YOU CHOOSE?

### Choose Option 1 (Dashboard) if:
- ✅ Want fastest solution
- ✅ Don't want to install tools
- ✅ Just need database set up once
- ✅ Prefer visual interface

### Choose Option 2 (CLI) if:
- ✅ Want version-controlled migrations
- ✅ Working with a team
- ✅ Need repeatable deployments
- ✅ Comfortable with command line

---

## 📌 MY RECOMMENDATION: Option 1 (Dashboard)

For your situation, **just use the dashboard**. It's:
- ✅ Faster (2 minutes vs 15 minutes)
- ✅ Simpler (no installation needed)
- ✅ Works perfectly fine

You can always install CLI later if needed.

---

## ✅ After Database Setup (Either Option)

Once you've run the SQL scripts (via dashboard or CLI):

### 1. Update Frontend Environment

Open `frontend/.env` and make sure it has:

```env
VITE_SUPABASE_URL=https://lrgxrfyzakehsnifypmd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get anon key**: https://app.supabase.com/project/lrgxrfyzakehsnifypmd/settings/api

### 2. Test Locally

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and test:
- Register new user
- Login
- Logout

### 3. Deploy to Vercel

Follow `IMMEDIATE_ACTION_PLAN.md`:
- Set Root Directory to `frontend`
- Add environment variables
- Deploy

---

## 🚀 Quick Start (Option 1 - 5 minutes)

1. **Go to**: https://app.supabase.com/project/lrgxrfyzakehsnifypmd/sql/new
2. **Copy**: `database/supabase_schema.sql` content
3. **Paste**: Into SQL Editor
4. **Run**: Click Run button
5. **Repeat**: For `database/supabase_rls_policies.sql`
6. **Done**: ✅ Database ready!

Then:
7. **Add anon key** to `frontend/.env`
8. **Test locally**: `npm run dev`
9. **Deploy to Vercel**

---

## 🆘 Still Having Issues?

If you get errors in SQL Editor:
- Make sure you copied the **complete** file
- Check for any syntax errors
- Try running in smaller sections

If deployment still fails:
- Check `IMMEDIATE_ACTION_PLAN.md`
- Make sure Root Directory is `frontend`
- Verify environment variables added

---

## 📚 Related Guides

- **IMMEDIATE_ACTION_PLAN.md** - Vercel deployment fix
- **SETUP_INSTRUCTIONS.md** - Full setup guide
- **CLI_QUICK_START.md** - If you choose CLI option

---

**Bottom Line**: Just use the Supabase Dashboard SQL Editor. It's simpler and works perfectly! 🎉

**Your database can be ready in 5 minutes!** Just copy-paste two SQL files into the dashboard. Go! 🚀
