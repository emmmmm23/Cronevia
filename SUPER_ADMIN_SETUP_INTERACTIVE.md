# 🚀 Interactive Super Admin Setup Guide

## Important: Read This First!

This guide will help you create your exclusive Super Admin account. You have **two options**:

### Option 1: Automated Setup (Recommended)
Run the PowerShell wizard script:
```bash
cd backend
powershell -ExecutionPolicy Bypass -File setup-super-admin.ps1
```

### Option 2: Manual Setup
Follow the interactive command:
```bash
cd backend
php artisan cronevia:create-super-admin
```

---

## 🔐 Information You'll Need

Before starting, prepare these details:

### 1. Your Full Name
- Example: `Juan Miguel`
- Used for: Account identification

### 2. Your Email Address
- Example: `juan@cronevia.com`
- Used for: Login and communications
- Must: Be unique (not already in database)

### 3. A Strong Password
Your password must include:
- ✅ Minimum 8 characters (12+ recommended)
- ✅ Uppercase letters (A-Z)
- ✅ Lowercase letters (a-z)
- ✅ Numbers (0-9)
- ✅ Symbols (!@#$%^&*)

#### Valid Password Examples
- `SecurePass123!`
- `Admin@Cronevia2024`
- `MyPassword#99abc`
- `CronEviaAdmin$2024`

#### Invalid Password Examples
- `password123` - Missing uppercase + symbols
- `PASSWORD!` - Missing lowercase + numbers
- `Pass1` - Too short
- `Secure` - No numbers or symbols

---

## 📋 Pre-Setup Checklist

Before creating your Super Admin account:

- [ ] Read this guide completely
- [ ] Have your full name ready
- [ ] Have your email ready
- [ ] Have a strong password in mind
- [ ] Database migrations are applied (`php artisan migrate:status`)
- [ ] No other Super Admin exists (this will be verified by the command)

---

## ✅ Step-by-Step Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

**Verify you see the Laravel application files.**

### Step 2: Choose Your Setup Method

#### Method A: PowerShell Wizard (Recommended)
```bash
powershell -ExecutionPolicy Bypass -File setup-super-admin.ps1
```

The wizard will:
1. Display the setup screen
2. Ask for your name
3. Ask for your email
4. Ask for your password
5. Ask for password confirmation
6. Review your information
7. Create your account
8. Show results

#### Method B: Artisan Command (Interactive)
```bash
php artisan cronevia:create-super-admin
```

The command will:
1. Display the setup screen
2. Ask: "Super Admin Name:"
   - Type: Your full name
   - Press: Enter
3. Ask: "Super Admin Email:"
   - Type: Your email address
   - Press: Enter
4. Ask: "Password (minimum 12 characters):"
   - Type: Your strong password
   - Press: Enter (password won't display)
5. Ask: "Confirm Password:"
   - Type: Same password again
   - Press: Enter

### Step 3: Follow the Interactive Prompts

#### Example Session:
```
╔═══════════════════════════════════════════════════════════════╗
║          CRONEVIA EXCLUSIVE SUPER ADMIN SETUP                  ║
╚═══════════════════════════════════════════════════════════════╝

This command will create the exclusive Super Admin account.
Only ONE Super Admin is permitted per Cronevia instance.

 Super Admin Name:
 > Juan Miguel

 Super Admin Email:
 > juan@cronevia.com

 Password (minimum 12 characters):
 > ••••••••••••••

 Confirm Password:
 > ••••••••••••••

Creating Super Admin account...

✓ Super Admin account created successfully!

Account Details:
  ID:    550e8400-e29b-41d4-a716-446655440000
  Name:  Juan Miguel
  Email: juan@cronevia.com
  Role:  super_admin
  Status: active

✓ Super Admin registration is now locked.
```

### Step 4: Receive Success Confirmation

When successful, you'll see:
```
✓ Super Admin account created successfully!

Account Details:
  ID:    [UUID]
  Name:  [Your Name]
  Email: [Your Email]
  Role:  super_admin
  Status: active

✓ Super Admin registration is now locked.
Only one Super Admin account is permitted.

Super Admin Login URL: /super-admin/login

⚠️  IMPORTANT SECURITY REMINDERS:
   • Store your password securely
   • Enable Multi-Factor Authentication (MFA) when available
   • Never share Super Admin credentials
   • Monitor audit logs for unauthorized access
```

---

## 🛡️ After Setup: Security Steps

### Immediately After (First 5 Minutes)

1. **Store Password Securely**
   ```
   ✅ Use a password manager (1Password, LastPass, Bitwarden)
   ✅ Create a backup recovery code
   ❌ Do NOT write down in plain text
   ❌ Do NOT share the password
   ❌ Do NOT commit to Git
   ```

2. **Note Your Account Details**
   - Super Admin Email: `[your email]`
   - Super Admin ID: `[from the output]`
   - Account Status: `active`
   - Role: `super_admin`

3. **Verify in Database** (Optional)
   ```bash
   php artisan tinker
   >>> User::getSuperAdmin()
   # Should show your account details
   >>> exit
   ```

---

## ✨ Next: Verify Everything Works

### Option 1: Run Tests
```bash
php artisan test
```
Expected: **30/30 tests pass** ✅

### Option 2: Check Database
```bash
php artisan tinker
>>> User::superAdminCount()
# Expected: 1

>>> User::getSuperAdmin()
# Expected: Your account details

>>> AuditLog::where('event_type', 'super_admin_created')->first()
# Expected: Audit log of creation

>>> exit
```

### Option 3: Test API Access

1. **Get Authentication Token**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@cronevia.com",
    "password": "your-password"
  }'
```

Response:
```json
{
  "message": "Login successful.",
  "user": {
    "id": "...",
    "email": "juan@cronevia.com",
    "role": "super_admin"
  }
}
```

2. **Access Admin Dashboard**
```bash
curl -X GET http://localhost:8000/api/v1/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "data": {
    "super_admin": { ... },
    "system": { ... },
    "application": { ... }
  }
}
```

---

## ❓ Troubleshooting

### Problem: "Super Admin account already exists"
**Cause**: An existing Super Admin is already in the database  
**Solution**: Only one is permitted. Use the replace command:
```bash
php artisan cronevia:replace-super-admin
```

### Problem: "Email already exists"
**Cause**: That email is already used by another account  
**Solution**: Use a different email address

### Problem: "Password too weak"
**Cause**: Password doesn't meet requirements  
**Solution**: Use 8+ characters with uppercase, lowercase, numbers, and symbols

### Problem: "Passwords do not match"
**Cause**: Password confirmation doesn't match  
**Solution**: Re-enter both passwords carefully

### Problem: "Type REPLACE SUPER ADMIN (exactly)"
**Cause**: You didn't match the exact confirmation text  
**Solution**: Type exactly: `REPLACE SUPER ADMIN` with capitals

### Problem: Command times out
**Cause**: Running in non-interactive terminal  
**Solution**: Use PowerShell wizard or run in interactive terminal

---

## 🔄 If Something Goes Wrong

### Check Migrations
```bash
php artisan migrate:status
# Both new migrations should show [Batch] Ran
```

### Reset Database (if needed)
```bash
# WARNING: This deletes all data!
php artisan migrate:refresh

# Then create Super Admin again
php artisan cronevia:create-super-admin
```

### Check Application Log
```bash
# View errors
cat storage/logs/laravel.log

# Or use tinker
php artisan tinker
>>> \Illuminate\Support\Facades\Log::all()
>>> exit
```

---

## 📞 Support

### Quick Help
- Documentation: `backend/SUPER_ADMIN_SETUP.md`
- Quick Ref: `backend/SUPER_ADMIN_QUICK_REFERENCE.md`
- This Guide: `SUPER_ADMIN_SETUP_INTERACTIVE.md`

### Run Tests if Stuck
```bash
php artisan test tests/Feature/SuperAdminExclusivityTest.php
php artisan test tests/Feature/SuperAdminCommandTest.php
```

---

## ✅ Checklist: Am I Done?

After successful setup:

- [ ] Command executed successfully
- [ ] No error messages
- [ ] Success message displayed
- [ ] Account details shown
- [ ] Password stored securely
- [ ] Tests pass (`php artisan test`)
- [ ] Database verified (`php artisan tinker`)
- [ ] API endpoint working

---

## 🎯 Summary

**You're about to:**
1. Create ONE exclusive Super Admin account
2. This account will be protected from deletion
3. It will have full admin access via API
4. All actions will be logged in audit trail
5. Only you will have these credentials

**Ready? Run:**

```bash
cd backend
php artisan cronevia:create-super-admin
```

Or use the PowerShell wizard:

```bash
powershell -ExecutionPolicy Bypass -File setup-super-admin.ps1
```

---

**Let's go! 🚀**
