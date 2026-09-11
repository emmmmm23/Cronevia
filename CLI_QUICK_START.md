# ⚡ Supabase CLI Quick Start

**You ran**: `supabase migration new` and `supabase db push`  
**Perfect!** That's the professional way. Here's how to integrate our prepared schema:

---

## 🚀 5-Minute Setup

### Step 1: Link Your Project

```bash
cd c:\Users\Juan Miguel\Cronevia
supabase link --project-ref lrgxrfyzakehsnifypmd
```

Enter your database password when prompted.

---

### Step 2: Create Schema Migration

```bash
supabase migration new 01_initial_schema
```

This creates a file like: `supabase/migrations/20260910123456_01_initial_schema.sql`

**Now**:
1. Open the new migration file
2. Open `database/supabase_schema.sql`
3. Copy **ALL** contents from `supabase_schema.sql`
4. Paste into your migration file
5. Save

---

### Step 3: Create RLS Migration

```bash
supabase migration new 02_rls_policies
```

**Now**:
1. Open the new migration file
2. Open `database/supabase_rls_policies.sql`
3. Copy **ALL** contents
4. Paste into your migration file
5. Save

---

### Step 4: Apply Migrations

```bash
supabase db push
```

**Expected output**:
```
Applying migration 20260910123456_01_initial_schema.sql...
Applying migration 20260910123457_02_rls_policies.sql...
Finished supabase db push.
```

---

### Step 5: Verify

```bash
supabase db remote ls
```

Should show your tables: profiles, user_settings, journal_entries, etc.

**Or check dashboard**:
- Table Editor → Should see 17 tables ✅
- Authentication → Policies → Should see RLS policies ✅

---

## 🎯 After Migration Success

1. **Get anon key**:
   - Go to: https://app.supabase.com/project/lrgxrfyzakehsnifypmd/settings/api
   - Copy **anon/public** key

2. **Update .env**:
   ```bash
   cd frontend
   # Edit .env and add your anon key
   ```

3. **Start app**:
   ```bash
   npm run dev
   ```

4. **Test**: http://localhost:5173

---

## ✅ Success Checklist

After `supabase db push`:
- [ ] No errors in terminal
- [ ] Tables visible in Supabase dashboard
- [ ] RLS policies enabled
- [ ] Can register new user in app
- [ ] Can login/logout

---

## 🆘 Troubleshooting

**"Cannot link project"**
→ Check database password in Supabase Dashboard → Settings → Database

**"Migration failed"**
→ Check SQL syntax in migration file
→ Make sure you copied the complete file

**"Already applied"**
→ Great! That means it worked
→ Verify with: `supabase migration list`

**Tables not showing**
→ Run: `supabase db pull` to sync
→ Check Supabase Dashboard → Table Editor

---

## 🎓 What You're Doing Right

Using Supabase CLI migrations is the **best practice** because:
- ✅ Version controlled
- ✅ Repeatable
- ✅ Team-friendly
- ✅ Can rollback if needed
- ✅ Works with CI/CD

You're ahead of the game! 🌟

---

## 📝 Quick Reference

```bash
# Link project
supabase link --project-ref lrgxrfyzakehsnifypmd

# Create migration
supabase migration new migration_name

# Apply to remote
supabase db push

# Pull from remote
supabase db pull

# List migrations
supabase migration list

# Check status
supabase db remote ls
```

---

**Next**: Once `supabase db push` succeeds, continue with frontend setup in `SETUP_INSTRUCTIONS.md` (starting from Step 5).

---

**You're on the right path!** 🚀
