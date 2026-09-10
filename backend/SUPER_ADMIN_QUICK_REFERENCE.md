# Cronevia Super Admin - Quick Reference

## Initial Setup (One-Time)

```bash
# 1. Run migrations
php artisan migrate

# 2. Create Super Admin
php artisan cronevia:create-super-admin
```

## Super Admin Credentials

- **Only ONE Super Admin** per instance
- **Server-side provisioning only** (no public UI)
- **Role: `super_admin`** (stored in database)
- **Status: `active`** (must be active to access admin)

## Key Commands

### Create First Super Admin
```bash
php artisan cronevia:create-super-admin
```

### Replace Super Admin (requires double confirmation)
```bash
php artisan cronevia:replace-super-admin
```

## Admin Routes

All require: `auth:sanctum` + `super_admin` middleware

```
GET    /api/v1/admin/dashboard              # Stats & overview
GET    /api/v1/admin/users                  # List all users
GET    /api/v1/admin/users/{id}             # User details
POST   /api/v1/admin/users/{id}/suspend     # Suspend user
POST   /api/v1/admin/users/{id}/reactivate  # Reactivate user
DELETE /api/v1/admin/users/{id}             # Delete user
GET    /api/v1/admin/database/status        # DB connection
GET    /api/v1/admin/system/health          # App health
GET    /api/v1/admin/security/status        # Security config
GET    /api/v1/admin/audit-logs             # View audit logs
```

## Response Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Not authenticated | Login first |
| 403 | Not authorized (not Super Admin or suspended) | Verify role in database |
| 200 | Success | ✓ |

## Database Queries (Tinker)

```bash
php artisan tinker

# Check super admin
>>> User::superAdminCount()
>>> User::getSuperAdmin()
>>> User::where('role', 'super_admin')->first()

# View audit logs
>>> AuditLog::superAdminEvents()->latest()->first()
>>> AuditLog::where('event_type', 'super_admin_created')->first()

# Check user role
>>> User::find('user-id')->role
>>> User::find('user-id')->isSuperAdmin()
```

## Security Checklist

- [ ] Super Admin password is strong (12+ chars, mixed case, numbers, symbols)
- [ ] Password stored in secure password manager
- [ ] HTTPS enabled in production
- [ ] Audit logs monitored regularly
- [ ] .env file is NOT committed to Git
- [ ] SESSION_SECURE_COOKIE=true in production
- [ ] Normal users cannot register as Super Admin
- [ ] Only one active Super Admin exists

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Super Admin already exists" | Already have one | Use `replace` command |
| "Password too weak" | Insufficient complexity | Use 12+ chars, mixed case, symbols |
| 403 Forbidden on admin route | Not Super Admin or suspended | Verify `role` and `status` in DB |
| "Email already exists" | Email in use | Use different email |
| Replacement confirmation fails | Wrong text | Type: `REPLACE SUPER ADMIN` exactly |

## Test Suite

```bash
# Run all tests
php artisan test

# Run Super Admin tests
php artisan test tests/Feature/SuperAdminExclusivityTest.php
php artisan test tests/Feature/SuperAdminCommandTest.php

# Run specific test
php artisan test tests/Feature/SuperAdminExclusivityTest.php::test_super_admin_can_be_created
```

## Architecture

```
Normal Users                Super Admin
    ↓                           ↓
/register                  Artisan command
    ↓                           ↓
role=user              role=super_admin
    ↓                           ↓
Limited access            Admin access
/api/v1/*              /api/v1/admin/*
    ↓                           ↓
Policy check           EnsureSuperAdmin
                       + Audit logging
```

## Key Files

- Migration: `database/migrations/2026_09_08_000001_add_role_to_users_table.php`
- Model: `app/Models/User.php`
- Middleware: `app/Http/Middleware/EnsureSuperAdmin.php`
- Policy: `app/Policies/SuperAdminPolicy.php`
- Commands: `app/Console/Commands/CreateSuperAdminCommand.php`
- Commands: `app/Console/Commands/ReplaceSuperAdminCommand.php`
- Controller: `app/Http/Controllers/Api/V1/SuperAdminController.php`
- Routes: `routes/api.php` (prefix: `/api/v1/admin`)
- Tests: `tests/Feature/SuperAdminExclusivityTest.php`
- Tests: `tests/Feature/SuperAdminCommandTest.php`
- Audit: `app/Models/AuditLog.php`
- Audit Service: `app/Services/AuditService.php`

## Remember

✓ **ONE Super Admin Only**  
✓ **Server-side provisioning**  
✓ **No public admin registration**  
✓ **Middleware + Policy protection**  
✓ **Audit logged**  
✓ **Cannot be deleted or demoted**  

---

For full documentation, see: **SUPER_ADMIN_SETUP.md**
