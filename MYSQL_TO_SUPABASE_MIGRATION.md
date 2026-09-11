# 🔄 MySQL to Supabase Data Migration Guide

## Overview

You have existing data in MySQL that needs to be preserved. Here's how to safely migrate it to Supabase.

---

## ⚠️ Important: Understand the Differences

### Schema Changes

| Laravel/MySQL | Supabase/PostgreSQL | Impact |
|---------------|---------------------|---------|
| `password_hash` column | No password column (auth.users handles it) | Need to re-hash or require password resets |
| Auto-increment IDs | UUIDs | Need to generate UUIDs for existing records |
| Eloquent timestamps | PostgreSQL timestamptz | Need date format conversion |
| `deleted_at` | Same (soft deletes) | Compatible ✅ |

---

## 🎯 Migration Strategy

### Option A: Fresh Start (Recommended)

**Best if**:
- Development/testing phase
- No critical production data
- Easy to recreate data

**Steps**:
1. Export important data as backup
2. Start fresh with Supabase
3. Keep MySQL backup if needed

### Option B: Full Migration (Required for Production)

**Best if**:
- Have real users and data
- Can't lose any data
- Need complete history

**Steps**:
1. Export MySQL data
2. Transform to PostgreSQL format
3. Handle password migration
4. Import to Supabase
5. Verify data integrity

---

## 📊 What Data Do You Have?

Let's check what's in your MySQL database. Run these queries:

### Check User Count
```sql
SELECT COUNT(*) as user_count FROM users;
```

### Check Journal Count
```sql
SELECT COUNT(*) as journal_count FROM journal_entries;
```

### Check Trip Count
```sql
SELECT COUNT(*) as trip_count FROM trips;
```

### Check if There's Production Data
```sql
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM journal_entries) as journals,
  (SELECT COUNT(*) FROM trips) as trips,
  (SELECT COUNT(*) FROM memories) as memories;
```

**If all counts are 0 or very low** → Option A (Fresh Start)  
**If you have real data** → Option B (Full Migration)

---

## 🔄 Option B: Full Migration Process

### Step 1: Export MySQL Data

```bash
# Export all tables to SQL file
mysqldump -u your_user -p cronevia > mysql_backup.sql

# Or export specific tables
mysqldump -u your_user -p cronevia users journal_entries trips memories > cronevia_data.sql
```

### Step 2: Export to CSV (Easier to transform)

```sql
-- Export users
SELECT * FROM users INTO OUTFILE '/tmp/users.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Export journal_entries
SELECT * FROM journal_entries INTO OUTFILE '/tmp/journal_entries.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Repeat for other tables...
```

### Step 3: Transform Data

Create a transformation script: `migrate_data.js`

```javascript
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://lrgxrfyzakehsnifypmd.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // ⚠️ Never commit this!
);

async function migrateUsers() {
  // Read MySQL export
  const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  
  for (const user of users) {
    // Create user in Supabase Auth (requires service role)
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: {
        full_name: user.name
      }
    });
    
    if (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
      continue;
    }
    
    // Map old ID to new UUID
    userIdMap[user.id] = data.user.id;
    
    // Profile is auto-created by trigger
    // Just need to update additional fields
    await supabase
      .from('profiles')
      .update({
        bio: user.bio,
        timezone: user.timezone,
        avatar_url: user.avatar_path
      })
      .eq('user_id', data.user.id);
  }
}

async function migrateJournals() {
  const journals = JSON.parse(fs.readFileSync('journals.json', 'utf8'));
  
  for (const journal of journals) {
    // Map old user_id to new UUID
    const newUserId = userIdMap[journal.user_id];
    
    if (!newUserId) {
      console.error(`User not found for journal ${journal.id}`);
      continue;
    }
    
    const { error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: newUserId,
        title: journal.title,
        content: journal.content,
        mood_emoji: journal.mood_emoji,
        mood_name: journal.mood_name,
        location_name: journal.location_name,
        latitude: journal.latitude,
        longitude: journal.longitude,
        entry_date: journal.entry_date,
        status: journal.status || 'published',
        created_at: journal.created_at,
        updated_at: journal.updated_at
      });
    
    if (error) {
      console.error(`Failed to migrate journal ${journal.id}:`, error);
    }
  }
}

// Run migration
(async () => {
  await migrateUsers();
  await migrateJournals();
  // Add more migrate functions...
})();
```

### Step 4: Handle Passwords

**Users will need to reset passwords** because:
- MySQL passwords are hashed with bcrypt
- Supabase uses different auth system
- Can't directly import password hashes

**Options**:
1. **Require password reset** (recommended)
   - Send password reset emails to all users
   - Users set new passwords
   
2. **Set temporary passwords**
   - Generate random passwords
   - Force password change on first login

### Step 5: Migrate Files

If you have uploaded files:

```javascript
async function migrateFiles() {
  const files = /* your uploaded files list */;
  
  for (const file of files) {
    const fileBuffer = fs.readFileSync(file.path);
    
    const { error } = await supabase.storage
      .from('journal-photos')
      .upload(`${userId}/${fileName}`, fileBuffer, {
        contentType: file.mime_type
      });
    
    if (error) {
      console.error(`Failed to upload ${fileName}:`, error);
    }
  }
}
```

---

## 🛡️ Safe Migration Process

### Before Migration

1. ✅ **Backup MySQL completely**
   ```bash
   mysqldump -u user -p cronevia > full_backup_$(date +%Y%m%d).sql
   ```

2. ✅ **Test on Supabase staging/dev first**
   - Create test Supabase project
   - Run migration script
   - Verify data

3. ✅ **Document ID mappings**
   - Keep mapping of old IDs → new UUIDs
   - Might need for support/debugging

### During Migration

1. ✅ **Put site in maintenance mode**
   - Prevent new data during migration
   - Or accept data loss for that window

2. ✅ **Run migration script**
   - Users first
   - Then dependent data (journals, trips, etc.)
   - Then relationships (tags, people)

3. ✅ **Verify counts**
   ```sql
   -- In Supabase
   SELECT COUNT(*) FROM profiles; -- Should match MySQL users
   SELECT COUNT(*) FROM journal_entries; -- Should match MySQL
   ```

### After Migration

1. ✅ **Test core functionality**
   - Login with migrated user
   - View migrated journals
   - Check all data visible

2. ✅ **Send password reset emails**
   ```javascript
   for (const user of migratedUsers) {
     await supabase.auth.resetPasswordForEmail(user.email);
   }
   ```

3. ✅ **Monitor for issues**
   - Check error logs
   - Watch user reports

---

## 🚨 What About Immediate Deployment?

### Hybrid Approach (Recommended)

You can deploy to Vercel with Supabase **now** and migrate data **later**:

1. **Deploy new infrastructure**
   - Vercel: Frontend
   - Supabase: Database (empty initially)

2. **Run in parallel**
   ```
   Old Site (Laravel + MySQL) ← Existing users
   New Site (Vercel + Supabase) ← New users
   ```

3. **Migrate gradually**
   - Pick a migration date
   - Migrate data during low-traffic period
   - Switch DNS to new site

### Quick Deploy Strategy

**For immediate deployment**:

1. **Deploy to Vercel NOW** (follow VERCEL_DEPLOYMENT_GUIDE.md)
2. **Use Supabase for new users** only
3. **Keep Laravel/MySQL running** for existing users temporarily
4. **Plan data migration** for weekend/low-traffic time
5. **Switch over** once migration complete

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] MySQL data exported and backed up
- [ ] Supabase project set up and tested
- [ ] Migration script written and tested
- [ ] ID mapping strategy decided
- [ ] Password reset plan in place
- [ ] File migration plan ready

### Migration Day
- [ ] Site in maintenance mode (optional)
- [ ] Run migration script
- [ ] Verify all data migrated
- [ ] Test core functionality
- [ ] Send password reset emails
- [ ] Switch to new system

### Post-Migration
- [ ] Monitor error logs
- [ ] Handle user support tickets
- [ ] Verify data integrity
- [ ] Keep MySQL backup for 30 days
- [ ] Document lessons learned

---

## 🤔 Recommendation for Your Situation

Since you need to **deploy immediately** AND have **existing MySQL data**:

### Phase 1: Deploy Now (Today)
1. ✅ Deploy frontend to Vercel
2. ✅ Use Supabase for authentication
3. ✅ **Keep Laravel/MySQL running for data**
4. ✅ New registrations go to Supabase
5. ✅ Existing users still use Laravel temporarily

### Phase 2: Hybrid (This Week)
- Frontend talks to both:
  - Supabase for new users
  - Laravel API for migrated users (temporarily)

### Phase 3: Full Migration (Next Weekend)
1. Schedule maintenance window
2. Run migration script
3. Switch all users to Supabase
4. Retire Laravel backend

---

## 💡 Simplified Approach

If you want the **simplest path**:

### Option: Fresh Start + Manual Data Entry

If data volume is manageable:
1. Deploy new system (Supabase + Vercel)
2. Email users about upgrade
3. Users re-register
4. Provide CSV export of their old data
5. Users can manually re-enter if needed

**Only viable if**:
- Small user base (< 100 users)
- Not much data per user
- Users are understanding

---

## 🆘 Need Help?

Let me know:
1. How many users do you have?
2. How many journal entries?
3. How critical is the data?
4. Can you afford any data loss?

Then I can provide a more specific migration plan!

---

**For immediate deployment**: Follow `VERCEL_DEPLOYMENT_GUIDE.md` first, worry about data migration second! 🚀
