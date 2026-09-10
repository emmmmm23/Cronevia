# Authentication-Based Home Routing - Quick Reference

## User Flows at a Glance

### 🟢 GUEST USER
```
1. Opens app → sees / (Landing)
2. Sees: "Login" and "Create Account" buttons in navbar
3. Logo links to: /
4. Tries to access /home → redirected to /login?redirect=/home
```

### 🔵 NORMAL USER
```
1. Registers or logs in → redirected to /home
2. Sees: Home, Journal, Trips, Memories, Timeline in navbar
3. Logo links to: /home
4. Sees: Dashboard with stats + recent entries (real MySQL data)
5. Clicks avatar → UserMenu (Profile, Settings, Sign Out)
6. Logs out → redirected to /
```

### 🔴 SUPER ADMIN
```
1. Logs in → redirected to /super-admin/dashboard
2. Sees: Dashboard, Users, Audit Logs, System Health in navbar
3. Logo links to: /super-admin/dashboard
4. Can access: /super-admin/* routes only
5. Tries to access /home → redirected to /super-admin/dashboard
6. Logs out → redirected to /
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| GET | `/api/v1/auth/me` | Get current user | Yes |
| POST | `/api/v1/auth/login` | Login | No |
| POST | `/api/v1/auth/register` | Register | No |
| POST | `/api/v1/auth/logout` | Logout | Yes |

### Dashboard
| Method | Endpoint | Purpose | Auth Required | Data |
|--------|----------|---------|---|---|
| GET | `/api/v1/dashboard` | Get dashboard data | Yes | counts + recents |

**Response**:
```json
{
  "journal_count": 5,
  "trip_count": 2,
  "memory_count": 12,
  "place_count": 8,
  "recent_journals": [...],
  "recent_trips": [...],
  "on_this_day": [...]
}
```

---

## Router Routes

### Public Routes
- `/` - Landing page (LandingPage.vue)
- `/login` - Login (LoginPage.vue)
- `/register` - Register (RegisterPage.vue)

### Authenticated Routes (User)
- `/home` - Dashboard (HomePage.vue)
- `/journal` - Journal list
- `/trips` - Trips list
- `/memories` - Memories
- `/map` - Map view
- `/search` - Search
- `/profile` - Profile
- `/settings` - Settings
- `/on-this-day` - Timeline

### Admin Routes (Super Admin Only)
- `/super-admin/dashboard` - Admin overview
- `/super-admin/users` - User management
- `/super-admin/audit-logs` - Audit logs
- `/super-admin/system-health` - System health

---

## Store Actions

### useAuthStore
```typescript
// Initialize auth state (called on app startup)
await auth.initialize()

// Login
await auth.login(email, password)

// Register
await auth.register(name, email, password, passwordConfirmation)

// Logout
auth.logout()
```

**State**:
```typescript
auth.isAuthenticated  // boolean
auth.user            // { id, name, email, role, status }
auth.loading         // boolean
auth.initialized     // boolean
auth.error           // string | null
```

### useDashboardStore
```typescript
// Fetch dashboard data
await dashboard.fetchDashboardData()
```

**State**:
```typescript
dashboard.journalCount    // number
dashboard.tripCount       // number
dashboard.memoryCount     // number
dashboard.placeCount      // number
dashboard.recentJournals  // array
dashboard.recentTrips     // array
dashboard.onThisDay       // array
dashboard.loading         // boolean
dashboard.error           // string | null
dashboard.isEmpty         // computed boolean
```

---

## Route Guards

### Meta Tags
```typescript
// Require authentication
meta: { requiresAuth: true }

// Guest only (redirect if authenticated)
meta: { guestOnly: true }

// Require specific role
meta: { requiresRole: 'super_admin' }
```

### Guard Logic
```
1. If requiresAuth && !authenticated → /login?redirect=<route>
2. If guestOnly && authenticated → /home or /super-admin/dashboard (by role)
3. If requiresRole && role mismatch → /home or /super-admin/dashboard (by role)
4. If landing page && authenticated → /home or /super-admin/dashboard (by role)
```

---

## Interceptors

### 401 (Unauthorized)
```
→ Clear auth state
→ Redirect to /login?redirect=<current-route>
```

### 403 (Forbidden)
```
→ If role='super_admin':  /super-admin/dashboard
→ If role='user':         /home
```

### All Requests
```
→ withCredentials: true (sends session cookie)
```

---

## Components

### LogoLink
```vue
<LogoLink />
```
- Routes based on auth state
- Guest: `/`
- User: `/home`
- Admin: `/super-admin/dashboard`

### UserMenu
```vue
<UserMenu @logout="handleLogout" />
```
- Shows avatar + name
- Links: Profile, Settings, Admin Dashboard (if admin), Sign Out

### AppNavbar
```vue
- Guest: Login, Create Account
- User: Home, Journal, Trips, Memories, Timeline, UserMenu
- Admin: Dashboard, Users, Audit Logs, System Health, UserMenu
```

---

## Data Flow

```
App.vue (onMounted)
  ↓
auth.initialize() called once
  ↓
GET /api/v1/auth/me (withCredentials=true)
  ↓
Response: { user: { id, name, email, role, status } }
  ↓
auth.isAuthenticated = true/false
auth.initialized = true
  ↓
Router.beforeEach runs (checks initialized flag)
  ↓
Routes rendered with correct layout
  ↓
HomePage.vue calls dashboard.fetchDashboardData()
  ↓
GET /api/v1/dashboard
  ↓
Dashboard stats + recent items displayed
```

---

## Common URLs During Testing

| Flow | URL | Component | Notes |
|------|-----|-----------|-------|
| Guest landing | `/` | LandingPage | "Login" button visible |
| Guest login | `/login` | LoginPage | No redirect param yet |
| Guest protected | `/home` | → `/login?redirect=/home` | Automatic redirect |
| New user after register | `/home` | HomePage | Empty state |
| User with data | `/home` | HomePage | Shows stats + recents |
| User navigates | `/journal` | JournalPage | AppNavbar shows Journal highlighted |
| User logs out | `/` | LandingPage | Navbar shows "Login" again |
| Admin login | `/login` | LoginPage | Same as user |
| Admin after login | `/super-admin/dashboard` | DashboardPage | NOT /home |
| Admin page | `/super-admin/users` | UsersPage | AppNavbar shows Users highlighted |

---

## Debugging Checklist

**Auth not working?**
1. Check browser DevTools → Application → Cookies (session cookie present?)
2. Check Network tab → see GET /api/v1/auth/me call?
3. Check Console for errors in auth.initialize()
4. Check backend: is Sanctum middleware enabled?

**Redirect not working?**
1. Check router.beforeEach guards
2. Check route meta tags (requiresAuth, guestOnly, requiresRole)
3. Check auth.isAuthenticated state
4. Check auth.user.role value

**Dashboard not loading?**
1. Check GET /api/v1/dashboard call
2. Check dashboard store state (loading, error)
3. Check HomePage.vue mounted hook calls fetchDashboardData()
4. Check DashboardController returns correct data

**Logo routing broken?**
1. Check LogoLink.vue computed logoRoute
2. Check auth.isAuthenticated
3. Check auth.user.role
4. Check router.push() in LogoLink

**Interceptor issues?**
1. Check api.service.ts response interceptor
2. Check withCredentials: true is set
3. Check 401/403 handling redirects
4. Check circular redirect loop (e.g., 401 on /login)

---

## Production Checklist

- [ ] HTTPS enabled (withCredentials requires secure context)
- [ ] Session cookies: Secure=true, HttpOnly=true, SameSite=lax
- [ ] CSRF tokens validated
- [ ] Rate limiting on login (prevent brute force)
- [ ] Session timeout configured
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging enabled
- [ ] Monitoring/alerting set up
- [ ] Backup strategy verified
- [ ] Load balancing configured (sticky sessions if needed)

---

## Quick Command Reference

```bash
# Start app
npm run dev

# Run backend
php artisan serve

# Create super admin (backend)
php artisan cronevia:create-super-admin

# Clear auth cache
php artisan cache:clear

# View session config
cat config/session.php

# View Sanctum config
cat config/sanctum.php
```

---

## Files to Know

### Core Auth
- `backend/resources/js/stores/auth.ts` - Auth state
- `backend/resources/js/stores/dashboard.ts` - Dashboard state
- `backend/resources/js/services/api.service.ts` - HTTP client + interceptors
- `backend/resources/js/router/index.ts` - Routes + guards

### UI
- `backend/resources/js/components/layout/AppNavbar.vue` - Navigation
- `backend/resources/js/components/layout/UserMenu.vue` - User dropdown
- `backend/resources/js/components/ui/LogoLink.vue` - Logo routing
- `backend/resources/js/pages/HomePage.vue` - User dashboard

### Admin Pages
- `backend/resources/js/pages/SuperAdmin/DashboardPage.vue`
- `backend/resources/js/pages/SuperAdmin/UsersPage.vue`
- `backend/resources/js/pages/SuperAdmin/AuditLogsPage.vue`
- `backend/resources/js/pages/SuperAdmin/SystemHealthPage.vue`

### Backend
- `backend/app/Http/Controllers/Api/V1/AuthController.php` - Auth logic
- `backend/app/Http/Controllers/Api/V1/DashboardController.php` - Dashboard data
- `backend/routes/api.php` - API routes

---

## Emergency Procedures

### User Can't Login
1. Check user exists in DB
2. Check password is correct (use tinker: `User::where('email', 'test@example.com')->first()`)
3. Check user.status != 'suspended'
4. Check backend is running
5. Check session table exists: `php artisan migrate`

### User Stuck in Login Loop
1. Clear browser cookies (Cmd+Shift+Delete)
2. Clear server session: `php artisan cache:clear`
3. Check for circular redirects in console
4. Check api.service.ts interceptor logic

### Admin Can't Access Admin Pages
1. Verify user.role = 'super_admin' in DB
2. Check router guard: `meta.requiresRole = 'super_admin'`
3. Check auth.user.role is set correctly
4. Clear auth cache: `php artisan cache:clear`

### Dashboard Shows Wrong User's Data
1. Check DashboardController filters by auth()->user()->id
2. Check SQL query includes WHERE user_id = ?
3. Check multiple users aren't sharing same session
4. Check browser cookies are isolated per user

---

## Contact / Support

For issues:
1. Check QUICK_REFERENCE.md (this file)
2. Check AUTH_HOME_ROUTING_E2E_TEST.md (test plan)
3. Check IMPLEMENTATION_SUMMARY.md (detailed docs)
4. Check Laravel & Vue documentation
5. Check browser console for errors
6. Check server logs: `tail -f storage/logs/laravel.log`
