# Cronevia Exclusive Super Admin Setup Guide

## Overview

Cronevia implements an **exclusive Super Admin provisioning system** designed for the system owner and developer. This document explains how to set up, manage, and secure the Super Admin account.

### Key Principles

- **ONE Super Admin Only**: Only a single Super Admin account is permitted per Cronevia instance
- **Server-Side Provisioning**: Super Admin creation is exclusively server-side via Artisan commands
- **No Public Registration**: There is no public UI for Super Admin registration
- **Secure by Default**: All admin endpoints are protected by middleware and authorization checks
- **Audited**: All Super Admin actions are logged in the audit trail

---

## Initial Setup: Creating Your First Super Admin

### Step 1: Prepare Your Environment

Before creating the Super Admin, ensure your Laravel environment is properly configured:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Run migrations to create the users table with role column
php artisan migrate

# 3. Verify the audit_logs table was created
php artisan migrate --list
```

### Step 2: Run the Create Super Admin Command

Use the Artisan command to create your exclusive Super Admin account:

```bash
php artisan cronevia:create-super-admin
```

You will be prompted interactively:

```
╔═══════════════════════════════════════════════════════════════╗
║          CRONEVIA EXCLUSIVE SUPER ADMIN SETUP                  ║
╚═══════════════════════════════════════════════════════════════╝

This command will create the exclusive Super Admin account.
Only ONE Super Admin is permitted per Cronevia instance.

 Super Admin Name:
 > Your Name

 Super Admin Email:
 > your-email@example.com

 Password (minimum 12 characters):
 > ••••••••••••

 Confirm Password:
 > ••••••••••••

Creating Super Admin account...

✓ Super Admin account created successfully!

Account Details:
  ID:    550e8400-e29b-41d4-a716-446655440000
  Name:  Your Name
  Email: your-email@example.com
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

### Step 3: Verify Super Admin Creation

Check that your Super Admin was created correctly:

```bash
# Query the database
php artisan tinker

# Inside tinker:
>>> User::where('role', 'super_admin')->get();
>>> User::superAdminCount();
>>> User::getSuperAdmin();
```

---

## Password Requirements

Super Admin passwords must meet these security standards:

- **Minimum 8 characters** (recommended 12+)
- **Mixed case** (uppercase and lowercase letters)
- **Numbers** (at least one digit: 0-9)
- **Symbols** (at least one special character: !@#$%^&*)

### Example Valid Passwords

✓ `SecurePass123!`  
✓ `MyAdmin@2024Secret`  
✓ `Cronevia#Admin99`  

### Example Invalid Passwords

✗ `password123` (no uppercase, no symbols)  
✗ `PASSWORD` (no lowercase, no numbers, no symbols)  
✗ `Pass1` (too short, no symbols)  

---

## Replacing the Super Admin

If you need to replace an existing Super Admin (e.g., credentials compromised, personnel change):

### Command: Replace Super Admin

```bash
php artisan cronevia:replace-super-admin
```

This command requires **double confirmation** to prevent accidental execution:

```
╔═══════════════════════════════════════════════════════════════╗
║       CRONEVIA REPLACE SUPER ADMIN (REQUIRES CONFIRMATION)     ║
╚═══════════════════════════════════════════════════════════════╝

Current Super Admin:
  Email: old-admin@example.com
  Name:  Old Admin
  Created: 2024-09-08 10:30:00

⚠️  WARNING: This operation will replace the Super Admin account.
   The current Super Admin will be suspended and cannot be undone.

 Are you sure you want to continue? (yes/no) [no]:
 > yes

⚠️  FINAL WARNING: This is a critical operation.
Type "REPLACE SUPER ADMIN" (exactly) to confirm:
 > REPLACE SUPER ADMIN

Proceeding with Super Admin replacement...

New Super Admin Name:
 > Your Name

New Super Admin Email:
 > new-email@example.com

New Password (minimum 8 characters):
 > ••••••••••••

Confirm Password:
 > ••••••••••••

Suspending old Super Admin account...
Old Super Admin account has been suspended.

Creating new Super Admin account...

✓ Super Admin account replaced successfully!

Old Super Admin (Suspended):
  Email:  old-admin@example.com
  Name:   Old Admin
  Status: Suspended

New Super Admin (Active):
  ID:    550e8400-e29b-41d4-a716-446655440001
  Email: new-email@example.com
  Name:  Your Name
  Role:  super_admin
  Status: active

Super Admin Login URL: /super-admin/login

⚠️  IMPORTANT SECURITY REMINDERS:
   • Store your new password securely
   • The old Super Admin account has been SUSPENDED
   • Only one active Super Admin is permitted
   • Enable Multi-Factor Authentication (MFA) when available
   • Monitor audit logs for all administrative changes
```

### What Happens During Replacement

1. **Verification**: The command confirms the current Super Admin exists
2. **Double Confirmation**: Requires explicit yes/no + exact text confirmation
3. **Suspension**: The old Super Admin account is **suspended** (not deleted)
4. **Creation**: A new Super Admin account is created
5. **Audit Log**: The replacement event is recorded in the audit trail
6. **Enforcement**: Only one **active** Super Admin exists after replacement

---

## Security Model

### Super Admin Roles & Permissions

The Super Admin has exclusive access to:

- **User Management**: View, suspend, reactivate, delete normal user accounts
- **Dashboard**: System statistics and application health
- **Audit Logs**: View all security-critical events
- **Database Status**: Check database connection and table information
- **System Health**: Monitor application environment and configuration
- **Security Status**: Review security settings and recommendations

### Authorization Layers

1. **Authentication**: Super Admin must log in with valid credentials
2. **Middleware**: `EnsureSuperAdmin` middleware verifies role at the request level
3. **Policy**: `SuperAdminPolicy` provides fine-grained authorization
4. **Database**: The `role` column enforces role at the data level

### Protected Routes

All admin endpoints require both authentication and Super Admin role:

```
GET    /api/v1/admin/dashboard                      - Dashboard statistics
GET    /api/v1/admin/users                          - List all users
GET    /api/v1/admin/users/{user}                   - View user details
POST   /api/v1/admin/users/{user}/suspend           - Suspend a user
POST   /api/v1/admin/users/{user}/reactivate        - Reactivate a user
DELETE /api/v1/admin/users/{user}                   - Delete a user
GET    /api/v1/admin/database/status                - Database connection status
GET    /api/v1/admin/system/health                  - System health information
GET    /api/v1/admin/security/status                - Security configuration
GET    /api/v1/admin/audit-logs                     - View audit logs
```

### Unauthorized Access Responses

**Unauthenticated (no token):**
```json
{
  "message": "Unauthenticated.",
  "status": 401
}
```

**Authenticated but not Super Admin:**
```json
{
  "message": "Unauthorized. Super Admin access required.",
  "status": 403
}
```

**Super Admin but account suspended:**
```json
{
  "message": "Forbidden. Super Admin account is not active.",
  "status": 403
}
```

---

## Normal User Registration

### Registration Endpoint

```
POST /api/v1/auth/register
```

### Request Payload

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!"
}
```

### Important Security Notes

- **Role is NOT accepted** in the registration request
- **Backend always assigns `role = 'user'`** to all new accounts
- Frontend attempts to set `"role": "super_admin"` are **ignored**
- All normal users register with the same role regardless of input

---

## Audit Logging

All security-critical events are logged in the `audit_logs` table:

### Logged Events

- `super_admin_created` - Super Admin account creation
- `super_admin_replaced` - Super Admin account replacement
- `super_admin_login` - Successful Super Admin login
- `super_admin_login_failed` - Failed Super Admin login attempt
- `user_suspended` - User account suspended by Super Admin
- `user_reactivated` - User account reactivated by Super Admin
- `user_deleted` - User account deleted by Super Admin
- `role_changed` - User role changed

### Viewing Audit Logs

```bash
# Via API endpoint (requires Super Admin role)
GET /api/v1/admin/audit-logs?per_page=50&event_type=super_admin_login

# Via tinker
php artisan tinker
>>> AuditLog::where('event_type', 'super_admin_created')->get();
>>> AuditLog::superAdminEvents()->get();
>>> AuditLog::securityEvents()->get();
```

### Audit Log Structure

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "super_admin_created",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "target_user_id": "550e8400-e29b-41d4-a716-446655440001",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "data": {
    "name": "Juan Miguel",
    "email": "admin@cronevia.com",
    "status": "active"
  },
  "environment": "local",
  "created_at": "2024-09-08T10:30:00Z",
  "updated_at": "2024-09-08T10:30:00Z"
}
```

---

## Testing

### Run Test Suite

```bash
# Run all tests
php artisan test

# Run Super Admin tests only
php artisan test tests/Feature/SuperAdminExclusivityTest.php
php artisan test tests/Feature/SuperAdminCommandTest.php

# Run specific test
php artisan test tests/Feature/SuperAdminExclusivityTest.php::test_super_admin_can_be_created

# Run tests with verbose output
php artisan test --verbose

# Run tests with coverage
php artisan test --coverage
```

### Test Scenarios Covered

✓ Only one Super Admin can exist  
✓ Normal registration creates role='user'  
✓ Frontend cannot override role to 'super_admin'  
✓ Super Admin account cannot be deleted  
✓ Super Admin account cannot be suspended  
✓ Normal users get 403 Forbidden on admin routes  
✓ Unauthenticated users get 401 Unauthorized  
✓ Super Admin can access all admin endpoints  
✓ Audit logs are created for all operations  
✓ Create/Replace commands validate passwords  

---

## Troubleshooting

### Issue: "A Super Admin account already exists"

**Cause**: You already have a Super Admin. Only one is permitted.

**Solution**: Use `php artisan cronevia:replace-super-admin` to change it.

### Issue: "Password must be at least 8 characters"

**Cause**: Your password is too short.

**Solution**: Use a password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.

### Issue: "Email already exists"

**Cause**: Another account already uses that email.

**Solution**: Use a different email address.

### Issue: "Type REPLACE SUPER ADMIN (exactly) to confirm"

**Cause**: You didn't type the exact confirmation text.

**Solution**: Type exactly: `REPLACE SUPER ADMIN` (with capitals and correct spacing).

### Issue: Super Admin cannot access admin routes (403 error)

**Possible causes**:
- Account role is not 'super_admin' in database
- Account status is 'suspended'
- Authentication token expired

**Solutions**:
1. Verify role and status in database: `User::find('user-id')`
2. Check authentication token is valid
3. Ensure request includes `Authorization: Bearer {token}` header

---

## Environment Configuration

### .env Configuration

```bash
# .env
APP_ENV=local
APP_DEBUG=true

# Super Admin setup flag (set to false after initial setup)
SUPER_ADMIN_SETUP_ENABLED=false

# Session configuration
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=false  # true in production
```

### Production Deployment

Before deploying to production:

1. **Run migrations**: `php artisan migrate --force`
2. **Create Super Admin**: `php artisan cronevia:create-super-admin`
3. **Disable setup flag**: Set `SUPER_ADMIN_SETUP_ENABLED=false` in .env
4. **Enable HTTPS**: Set `SESSION_SECURE_COOKIE=true`
5. **Monitor audit logs**: Regularly review `audit_logs` table

---

## Security Best Practices

### For Super Admin Account Owner

1. **Strong Password**: Use a complex, unique password (12+ characters)
2. **Secure Storage**: Store password in secure password manager
3. **Never Share**: Never share Super Admin credentials
4. **MFA Enabled**: Enable Multi-Factor Authentication when available
5. **Monitor Logs**: Regularly review audit logs for suspicious activity
6. **Backup Access**: Consider backup Super Admin recovery procedures
7. **Regular Audits**: Periodically review user accounts and permissions
8. **Secure Network**: Access admin endpoints over HTTPS only

### For Backend Infrastructure

1. **HTTPS Required**: Always use HTTPS in production
2. **Session Security**: Enable secure session cookies
3. **Rate Limiting**: Super Admin login is rate-limited
4. **IP Whitelisting**: Consider restricting admin IPs (if applicable)
5. **Database Backup**: Regularly backup the database
6. **Credential Rotation**: Change Super Admin password periodically
7. **Audit Log Retention**: Archive audit logs for compliance

### What NOT to Do

✗ Do NOT hardcode Super Admin email/password in code  
✗ Do NOT commit credentials to Git  
✗ Do NOT expose .env file  
✗ Do NOT allow normal users to access admin routes  
✗ Do NOT delete audit logs without retention policy  
✗ Do NOT use weak passwords  
✗ Do NOT share Super Admin token/credentials  
✗ Do NOT skip HTTPS in production  

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   CRONEVIA                           │
└──────────────────────────────────────────────────────┘
                        │
                        ├─ NORMAL USERS
                        │  ├─ /api/v1/auth/register
                        │  ├─ /api/v1/auth/login
                        │  ├─ role = 'user'
                        │  └─ Access: User workspace only
                        │
                        └─ SUPER ADMIN
                           ├─ php artisan cronevia:create-super-admin
                           ├─ role = 'super_admin'
                           ├─ /api/v1/admin/* (protected)
                           ├─ EnsureSuperAdmin middleware
                           ├─ SuperAdminPolicy checks
                           └─ Audit logging
```

---

## Support & Maintenance

### Getting Help

- Review this guide first
- Check test files for usage examples
- Review audit logs for debugging
- Inspect model methods: `User::superAdminCount()`, `User::getSuperAdmin()`

### Maintenance Tasks

- **Monthly**: Review audit logs for security events
- **Quarterly**: Test backup/restore procedures
- **Annually**: Conduct security audit

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-09-08 | 1.0 | Initial Super Admin system implementation |

---

## References

- Laravel Authentication: https://laravel.com/docs/11.x/authentication
- Laravel Authorization: https://laravel.com/docs/11.x/authorization
- Laravel Middleware: https://laravel.com/docs/11.x/middleware
- Cronevia API Documentation: See backend/README.md

---

**Last Updated**: September 8, 2026  
**Maintained By**: Cronevia Development Team  
**Security Level**: CONFIDENTIAL
