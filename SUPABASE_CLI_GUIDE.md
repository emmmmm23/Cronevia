# Supabase CLI Migration Guide

## You're Using Supabase CLI! 🎉

That's actually the **better** approach than manually running SQL files. Let me help you set it up properly.

---

## Quick Setup

### 1. Link Your Project

```bash
supabase link --project-ref lrgxrfyzakehsnifypmd
```

This will prompt for your database password.

### 2. Create Migration from Our Schema

Instead of creating an empty migration, let's use our prepared schema:

```bash
# Copy our schema to a new migration
supabase migration new initial_cronevia_schema
```

Then copy the contents of `database/supabase_schema.sql` into the newly created migration file in `supabase/migrations/`.

### 3. Apply the Migration

```bash
supabase db push
```

This will apply all migrations to your remote Supabase database.

---

## Alternative: Use Our SQL Files Directly

Since we already have complete SQL files, you have two options:

### Option A: Manual SQL (What I originally recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy `database/supabase_schema.sql`
3. Paste and run
4. Copy `database/supabase_rls_policies.sql`  
5. Paste and run

**Pros**: Simple, visual, no CLI needed  
**Cons**: Not version controlled

### Option B: Supabase CLI (What you're doing now)

1. Link project: `supabase link --project-ref lrgxrfyzakehsnifypmd`
2. Create migration file
3. Copy our SQL into it
4. Run: `supabase db push`

**Pros**: Version controlled, team-friendly, repeatable  
**Cons**: Requires CLI setup

---

## Setting Up Supabase CLI Migration

Here's how to integrate our existing SQL files:

### Step 1: Install Supabase CLI (if not done)

```bash
# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm
npm install -g supabase
```

### Step 2: Initialize (if not done)

```bash
cd c:\Users\Juan Miguel\Cronevia
supabase init
```

### Step 3: Link to Your Project

```bash
supabase link --project-ref lrgxrfyzakehsnifypmd
```

**Enter your database password** when prompted.

### Step 4: Create Initial Migration

```bash
supabase migration new initial_schema
```

This creates: `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql`

### Step 5: Copy Our Schema

Copy the contents of `database/supabase_schema.sql` into the newly created migration file.

### Step 6: Create RLS Migration

```bash
supabase migration new rls_policies
```

Copy the contents of `database/supabase_rls_policies.sql` into this file.

### Step 7: Apply Migrations

```bash
supabase db push
```

This will apply both migrations to your remote database!

---

## Verify Migration

Check if it worked:

```bash
# List migrations
supabase migration list

# Check migration status
supabase db remote ls
```

Or in Supabase Dashboard:
- Go to **Table Editor** → Should see 17 tables
- Go to **Authentication** → **Policies** → Should see RLS policies

---

## My Recommendation

Since you already have `supabase migration new` running, here's the **fastest path**:

### Quick Integration Steps

1. **Don't create empty migrations**, instead:

```bash
cd c:\Users\Juan Miguel\Cronevia

# Link your project
supabase link --project-ref lrgxrfyzakehsnifypmd

# Create schema migration
supabase migration new 01_initial_schema

# This creates: supabase/migrations/YYYYMMDD_01_initial_schema.sql
```

2. **Copy our prepared schema**:
   - Open: `database/supabase_schema.sql`
   - Copy ALL contents
   - Paste into: `supabase/migrations/YYYYMMDD_01_initial_schema.sql`

3. **Create RLS migration**:

```bash
supabase migration new 02_rls_policies
```

4. **Copy our prepared RLS policies**:
   - Open: `database/supabase_rls_policies.sql`
   - Copy ALL contents
   - Paste into: `supabase/migrations/YYYYMMDD_02_rls_policies.sql`

5. **Apply everything**:

```bash
supabase db push
```

6. **Verify**:

```bash
supabase db remote ls
```

---

## What About My SQL Files?

The `database/` folder SQL files are still valuable:

- **Reference documentation** ✅
- **Backup** ✅
- **Can be used manually** ✅
- **Source for migrations** ✅

They just need to be **copied** into Supabase CLI migration files.

---

## Common Supabase CLI Commands

```bash
# Link to project
supabase link --project-ref lrgxrfyzakehsnifypmd

# Create new migration
supabase migration new migration_name

# Apply migrations to remote
supabase db push

# Pull remote schema
supabase db pull

# List migrations
supabase migration list

# Reset local database (careful!)
supabase db reset

# Start local Supabase (for development)
supabase start

# Stop local Supabase
supabase stop
```

---

## Troubleshooting

### "Cannot connect to database"
→ Check your database password
→ Run: `supabase link --project-ref lrgxrfyzakehsnifypmd` again

### "Migration already applied"
→ That's fine! It means the migration worked
→ Check with: `supabase migration list`

### "Permission denied"
→ Make sure you have the correct database password
→ Check Supabase Dashboard → Settings → Database

### "Syntax error in migration"
→ Check the SQL file for errors
→ Make sure you copied the complete file

---

## Next Steps

1. ✅ Link your project (if not done)
2. ✅ Create migration files
3. ✅ Copy our SQL into them
4. ✅ Run `supabase db push`
5. ✅ Verify tables exist
6. ✅ Continue with frontend setup

---

## Status After Migration

Once `supabase db push` succeeds:

- ✅ 17 tables created
- ✅ All indexes and triggers in place
- ✅ RLS policies active
- ✅ Super admin functions ready
- ✅ Profile auto-creation working

Then proceed with:
1. Adding anon key to `frontend/.env`
2. Running `npm run dev`
3. Testing authentication

---

**You're on the right track using Supabase CLI!** It's the professional way to manage database migrations.

Just integrate our prepared SQL files into your migration files and you're golden. 🌟
