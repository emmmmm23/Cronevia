# ✅ PHASE 0: PRE-MIGRATION CHECKLIST

**Complete these tasks before starting the database migration**

---

## Task 0.1: Backup Everything ⏱️ 30 minutes

### Database Backup

```powershell
# Navigate to backend
cd backend

# Dump MySQL database
php artisan db:dump

# Or with custom name
php artisan db:dump cronevia_backup_20260911.sql
```

**Verify:**
- [ ] SQL file created in `backend/database/backups/` or `backend/`
- [ ] File size > 0 bytes
- [ ] File contains your 3 users and 2 journals

---

### Environment Files Backup

```powershell
# Backup frontend .env
cp frontend/.env frontend/.env.backup

# Backup backend .env
cp backend/.env backend/.env.backup
```

**Verify:**
- [ ] `frontend/.env.backup` exists
- [ ] `backend/.env.backup` exists

---

### Git Backup

```powershell
# Commit everything
git add -A
git commit -m "Pre-migration backup - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Create tag for easy rollback
git tag v1.0-pre-migration

# Push to remote (if you have one)
git push origin main
git push origin v1.0-pre-migration
```

**Verify:**
- [ ] All files committed
- [ ] Tag created: `git tag` shows v1.0-pre-migration
- [ ] Pushed to remote (if applicable)

---

## Task 0.2: Apply Pending Laravel Migrations ⏱️ 15 minutes

```powershell
cd backend

# Check current migration status
php artisan migrate:status

# Apply pending migrations
php artisan migrate --force

# Verify all migrations ran
php artisan migrate:status
```

**Verify:**
- [ ] All migrations show "[Ran]" status
- [ ] No "[Pending]" migrations remain
- [ ] No errors in console

**Expected output:**
```
Migration name .................................. Batch / Status
...
2026_09_10_115909_add_is_archived... ............. [X] Ran
2026_09_10_120000_add_journal_entry_id... ........ [X] Ran
2026_09_10_120100_add_trip_id... ................. [X] Ran
2026_09_10_120200_update_media_table... .......... [X] Ran
```

---

## Task 0.3: Export Current Data Structure ⏱️ 30 minutes

### Export Schema

```powershell
cd backend

# Export current schema
php artisan schema:dump --database=mysql > database/schema_export_20260911.sql
```

**Verify:**
- [ ] File created: `backend/database/schema_export_20260911.sql`
- [ ] File contains CREATE TABLE statements

---

### Export Data as JSON (for reference)

```powershell
cd backend

# Create a quick export script
php artisan tinker
```

In tinker console:
```php
$data = [
    'users' => App\Models\User::with('profile')->get(),
    'journals' => App\Models\JournalEntry::with('media')->get(),
    'trips' => App\Models\Trip::with('days', 'media')->get(),
    'memories' => App\Models\Memory::with('media')->get(),
];

file_put_contents(
    storage_path('migration_data_20260911.json'), 
    json_encode($data, JSON_PRETTY_PRINT)
);

echo "Exported " . count($data['users']) . " users\n";
echo "Exported " . count($data['journals']) . " journals\n";
echo "Exported " . count($data['trips']) . " trips\n";
echo "Exported " . count($data['memories']) . " memories\n";

exit
```

**Verify:**
- [ ] File created: `backend/storage/migration_data_20260911.json`
- [ ] JSON contains your 3 users
- [ ] JSON contains your 2 journals

---

## Task 0.4: Get Supabase Anon Key ⏱️ 5 minutes

### ✅ COMPLETED!

- [x] Visited Supabase dashboard
- [x] Got anon key: `sb_publishable_2KJr5ivvLxGuBVwH2SRMkA_3-ImIK3T`
- [x] Updated `frontend/.env`
- [x] Updated `frontend/.env.example`

---

## Task 0.5: Test Supabase Connection ⏱️ 10 minutes

### Quick Test

```powershell
cd frontend

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

Visit: http://localhost:5173

**Open browser console (F12) and check:**
- [ ] No Supabase connection errors
- [ ] Environment variables loaded
- [ ] Supabase client initialized

---

### Alternative: Use Test HTML

Create `frontend/test-supabase.html` (see TEST_SUPABASE_CONNECTION.md for code)

Open in browser and verify:
- [ ] ✅ Supabase client initialized
- [ ] ✅ Connected to Supabase successfully
- [ ] ⚠️ Database tables not created yet (expected)

---

## Task 0.6: Install Supabase CLI (Optional) ⏱️ 10 minutes

### Windows Installation

```powershell
# Via npm (recommended)
npm install -g supabase

# Or via Scoop
scoop install supabase
```

**Verify:**
```powershell
supabase --version
```

Should show: `supabase version X.X.X`

---

### Link to Your Project

```powershell
# Navigate to project root
cd c:\Users\Juan Miguel\Cronevia

# Link to remote Supabase project
supabase link --project-ref lrgxrfyzakehsnifypmd
```

**Verify:**
- [ ] Linked successfully
- [ ] `.supabase/` folder created
- [ ] Can run `supabase status`

---

## Task 0.7: Start Local Supabase (Optional) ⏱️ 15 minutes

If you want to test locally before pushing to production:

```powershell
# Ensure Docker Desktop is running (required)
# Download from: https://www.docker.com/products/docker-desktop/

# Start local Supabase
supabase start
```

**This will start:**
- Local PostgreSQL database (port 54322)
- Supabase Studio (http://localhost:54323)
- Local API (port 54321)
- Local Auth (built-in)
- Local Storage (built-in)

**Verify:**
- [ ] All services started
- [ ] Can access Studio at http://localhost:54323
- [ ] No port conflicts

---

## Task 0.8: Document Current User Count ⏱️ 5 minutes

```powershell
cd backend

php artisan tinker --execute="
echo 'Current Data Inventory:\n';
echo '=====================\n';
echo 'Users: ' . App\Models\User::count() . '\n';
echo 'Journals: ' . App\Models\JournalEntry::count() . '\n';
echo 'Trips: ' . App\Models\Trip::count() . '\n';
echo 'Memories: ' . App\Models\Memory::count() . '\n';
echo 'Media: ' . App\Models\Media::count() . '\n';
echo '=====================\n';
"
```

**Document the counts:**
- [ ] Users: ______ (expected: 3)
- [ ] Journals: ______ (expected: 2)
- [ ] Trips: ______ (expected: 0)
- [ ] Memories: ______ (expected: 0)
- [ ] Media: ______ (expected: 0)

**These numbers must match after migration!**

---

## Task 0.9: Review Migration Plan ⏱️ 30 minutes

**Read these documents:**

1. [ ] `MIGRATION_START_HERE.md` - Overview
2. [ ] `MIGRATION_QUICK_REFERENCE.md` - Quick guide
3. [ ] `SUPABASE_MIGRATION_IMPLEMENTATION_PLAN.md` - Phase 1 section

**Understand:**
- [ ] What Phase 1 will do (create database tables)
- [ ] What RLS is and why it's critical
- [ ] How data migration will work (Phase 2)
- [ ] The overall timeline (3-4 weeks)

---

## Task 0.10: Prepare Your Workspace ⏱️ 10 minutes

### Create Working Folders

```powershell
# Create folders for new files
mkdir supabase/migrations -Force
mkdir frontend/src/services/supabase -Force
mkdir scripts -Force
mkdir docs/migration -Force
```

**Verify:**
- [ ] `supabase/migrations/` exists
- [ ] `frontend/src/services/supabase/` exists
- [ ] `scripts/` exists
- [ ] `docs/migration/` exists

---

### Set Up Your Editor

Open VS Code (or your editor) with:
```powershell
code .
```

**Have these files ready:**
- [ ] `SUPABASE_MIGRATION_IMPLEMENTATION_PLAN.md` (reference)
- [ ] `MIGRATION_QUICK_REFERENCE.md` (quick lookup)
- [ ] `PHASE_0_CHECKLIST.md` (this file)

---

## ✅ PHASE 0 COMPLETION CHECKLIST

Before moving to Phase 1, verify ALL items:

### Backups
- [ ] MySQL database backed up (SQL file exists)
- [ ] `.env` files backed up
- [ ] Git commit created
- [ ] Git tag created (v1.0-pre-migration)

### Migrations
- [ ] All Laravel migrations applied
- [ ] No pending migrations remain
- [ ] Schema exported

### Data
- [ ] Current data counts documented
- [ ] JSON export created (reference)
- [ ] Know exactly what to migrate (3 users, 2 journals)

### Configuration
- [ ] Supabase anon key configured
- [ ] Supabase connection tested
- [ ] Frontend `.env` updated
- [ ] Environment variables verified

### Tools
- [ ] Supabase CLI installed (optional but recommended)
- [ ] Linked to remote project (optional)
- [ ] Local Supabase started (optional)

### Planning
- [ ] Read migration plan
- [ ] Understand next steps
- [ ] Workspace folders created
- [ ] Editor set up

---

## 🎉 Phase 0 Complete!

When all checkboxes are ticked, you're ready for:

**PHASE 1: SUPABASE DATABASE SETUP**

Open: `SUPABASE_MIGRATION_IMPLEMENTATION_PLAN.md`  
Start: **Phase 1, Task 1.1: Create Complete Database Schema**

---

## 🆘 Troubleshooting

### Issue: MySQL dump fails
```powershell
# Try manual export
mysqldump -u root cronevia > cronevia_backup.sql
```

### Issue: Migration errors
```powershell
# Check migration status
php artisan migrate:status

# Rollback last batch if needed
php artisan migrate:rollback

# Then re-run
php artisan migrate
```

### Issue: Supabase CLI not found
```powershell
# Verify npm global path
npm config get prefix

# If not in PATH, add it or use npx
npx supabase --version
```

### Issue: Can't connect to Supabase
- Check internet connection
- Verify anon key is correct
- Check Supabase project is active at dashboard

---

## 📊 Time Tracking

| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| 0.1 Backup | 30 min | ___ | ⬜ |
| 0.2 Migrations | 15 min | ___ | ⬜ |
| 0.3 Export Data | 30 min | ___ | ⬜ |
| 0.4 Anon Key | 5 min | ___ | ✅ |
| 0.5 Test Connection | 10 min | ___ | ⬜ |
| 0.6 Install CLI | 10 min | ___ | ⬜ |
| 0.7 Local Supabase | 15 min | ___ | ⬜ |
| 0.8 Document Counts | 5 min | ___ | ⬜ |
| 0.9 Review Plan | 30 min | ___ | ⬜ |
| 0.10 Workspace | 10 min | ___ | ⬜ |
| **TOTAL** | **2.5 hours** | ___ | ⬜ |

---

**Version:** 1.0  
**Created:** September 11, 2026  
**Status:** Ready to Use  

**Start here, complete all tasks, then move to Phase 1!** 🚀
