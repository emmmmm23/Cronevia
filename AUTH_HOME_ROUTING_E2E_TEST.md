# Authentication-Based Home Routing - E2E Test Plan

## Overview
This document verifies all 19 implementation tasks for authentication-based home routing in CRONEVIA. Tests cover guest experience, user login flow, admin access, and edge cases.

---

## Test Scenarios

### 1. GUEST / UNAUTHENTICATED USER

#### 1.1: Landing Page Accessible
- **Expected**: Guest can access `/` without authentication
- **Steps**:
  1. Open app in fresh incognito window
  2. Navigate to `/`
- **Verification**:
  - ✓ LandingPage.vue loads
  - ✓ AppNavbar shows: "Login" and "Create Account" buttons
  - ✓ No user menu visible
  - ✓ Logo (top-left) links to `/`

#### 1.2: Protected Routes Redirect to Login
- **Expected**: Accessing `/home` redirects to `/login?redirect=/home`
- **Steps**:
  1. As guest, navigate to `/home`
- **Verification**:
  - ✓ Redirected to `/login` page
  - ✓ URL shows `?redirect=/home` query param
  - ✓ AppLayout loading spinner should NOT appear (guest goes straight to login)

#### 1.3: All Protected Routes Require Auth
- **Expected**: Guest cannot access any authenticated routes
- **Routes to test**: `/trips`, `/journal`, `/memories`, `/map`, `/search`, `/profile`, `/settings`
- **Steps**: Navigate to each route as guest
- **Verification**:
  - ✓ All redirect to `/login?redirect=<original-route>`

#### 1.4: Admin Routes Require Auth
- **Expected**: Guest cannot access super-admin routes
- **Routes to test**: `/super-admin/dashboard`, `/super-admin/users`, `/super-admin/audit-logs`, `/super-admin/system-health`
- **Verification**:
  - ✓ All redirect to `/login` (no redirect param needed for guest)

---

### 2. NORMAL USER LOGIN FLOW

#### 2.1: Registration (New User)
- **Expected**: New user registers and lands on `/home`
- **Steps**:
  1. Click "Create Account" on landing page
  2. Fill form: Name, Email, Password (8+ chars), Confirm Password
  3. Submit
- **Verification**:
  - ✓ No role selection field in form
  - ✓ Form validation works (password must be 8+ chars)
  - ✓ Backend assigns role="user" by default
  - ✓ After registration, redirected to `/home` (not admin dashboard)
  - ✓ auth.user.role = 'user'
  - ✓ HomePage loads with dashboard data

#### 2.2: Login (Existing User)
- **Expected**: User logs in with email/password, redirects to `/home`
- **Steps**:
  1. Go to `/login`
  2. Enter email & password
  3. Submit
- **Verification**:
  - ✓ Form validates email and password
  - ✓ On success, redirected to `/home`
  - ✓ auth.isAuthenticated = true
  - ✓ auth.user.role = 'user'
  - ✓ Session cookie set (HttpOnly)

#### 2.3: Login with Redirect Query Param
- **Expected**: User logs in from protected route, redirected back to original route
- **Steps**:
  1. As guest, navigate to `/profile?some-query-param`
  2. Redirected to `/login?redirect=/profile%3Fsome-query-param`
  3. Login with valid credentials
- **Verification**:
  - ✓ After login, redirected to `/profile?some-query-param` (original route preserved)
  - ✓ Query params preserved in redirect

#### 2.4: Home Dashboard Displays Real Data
- **Expected**: HomePage shows live dashboard data from MySQL
- **Steps**:
  1. Login as normal user
  2. Navigate to or land on `/home`
- **Verification**:
  - ✓ Greeting displays (Good morning/afternoon/evening + first name)
  - ✓ "Write a Memory" and "Plan a Trip" buttons functional
  - ✓ Recent Journal section shows recent journal entries from DB (or empty state for new users)
  - ✓ Your Archive stats show real counts from DashboardController:
    - Journal Entries: dashboard.journalCount
    - Trips: dashboard.tripCount
    - Memories: dashboard.memoryCount
    - Places: dashboard.placeCount
  - ✓ Loading spinner visible while fetching (if slow)
  - ✓ Empty state shown if no entries exist (new user)

#### 2.5: Logo Routing (Normal User)
- **Expected**: Logo navigates to `/home` for normal users
- **Steps**:
  1. Login as normal user
  2. Navigate somewhere (e.g., `/trips`)
  3. Click logo (top-left)
- **Verification**:
  - ✓ Logo is RouterLink (not full page reload)
  - ✓ Navigates to `/home` route
  - ✓ No full page refresh

#### 2.6: NavBar Conditional Rendering (Normal User)
- **Expected**: AppNavbar shows user-specific links
- **Verification**:
  - ✓ Desktop: Home, Journal, Trips, Memories, Timeline visible
  - ✓ UserMenu (avatar dropdown) visible in top-right
  - ✓ UserMenu shows: User name, Profile link, Settings link, Sign Out
  - ✓ No "Admin Dashboard" in UserMenu for normal user
  - ✓ Mobile menu mirrors desktop nav

#### 2.7: UserMenu Logout
- **Expected**: Clicking Sign Out clears session and redirects to `/`
- **Steps**:
  1. Login as normal user
  2. Click avatar → UserMenu
  3. Click "Sign Out"
- **Verification**:
  - ✓ auth.isAuthenticated = false
  - ✓ Session cookie cleared
  - ✓ Redirected to `/` (landing page)
  - ✓ AppNavbar now shows "Login" and "Create Account" buttons

#### 2.8: Session Expiry (401 Interceptor)
- **Expected**: Expired session redirects to `/login?redirect=<current-route>`
- **Steps**:
  1. Login as normal user
  2. Manually clear session cookie (dev tools)
  3. Trigger API call (e.g., navigate page, refresh)
- **Verification**:
  - ✓ API returns 401
  - ✓ Interceptor clears auth state
  - ✓ Redirected to `/login?redirect=<current-route>`
  - ✓ User can log back in and return to original route

---

### 3. SUPER ADMIN LOGIN FLOW

#### 3.1: Admin Registration (Manual Setup)
- **Expected**: Super admin must be created via CLI or seeder, not through registration form
- **Steps**:
  1. Use CreateSuperAdminCommand: `php artisan cronevia:create-super-admin`
- **Verification**:
  - ✓ Super admin user created with role='super_admin'
  - ✓ Cannot register as super_admin through UI

#### 3.2: Admin Login Redirects to Admin Dashboard
- **Expected**: Super admin logs in, redirects to `/super-admin/dashboard` (not `/home`)
- **Steps**:
  1. Go to `/login`
  2. Login with super_admin credentials
- **Verification**:
  - ✓ LoginPage checks auth.user.role after login
  - ✓ If role='super_admin', redirects to { name: 'admin-dashboard' }
  - ✓ Lands on `/super-admin/dashboard`
  - ✓ auth.user.role = 'super_admin'

#### 3.3: Logo Routing (Admin)
- **Expected**: Logo navigates to `/super-admin/dashboard` for admin
- **Steps**:
  1. Login as super_admin
  2. Navigate somewhere (e.g., `/super-admin/users`)
  3. Click logo
- **Verification**:
  - ✓ Navigates to `/super-admin/dashboard` (computed logoRoute)
  - ✓ No full page refresh (RouterLink)

#### 3.4: NavBar Conditional Rendering (Admin)
- **Expected**: AppNavbar shows admin-specific links
- **Verification**:
  - ✓ Desktop: Dashboard, Users, Audit Logs, System Health visible
  - ✓ UserMenu shows: Admin Dashboard link (in addition to standard links)
  - ✓ Profile, Settings, Sign Out still present
  - ✓ Mobile menu mirrors desktop

#### 3.5: Admin Dashboard Page
- **Expected**: `/super-admin/dashboard` loads and displays placeholder content
- **Steps**:
  1. Login as super_admin
  2. Already at `/super-admin/dashboard`
- **Verification**:
  - ✓ DashboardPage.vue loads (title: "Super Admin Dashboard")
  - ✓ Stats cards visible (Total Users, Active Sessions, System Health, Audit Logs)
  - ✓ Quick Actions buttons (View All Users, Audit Logs, System Health)
  - ✓ Page wrapped in AppLayout

#### 3.6: Admin Users Page
- **Expected**: `/super-admin/users` accessible
- **Steps**:
  1. As super_admin, navigate to `/super-admin/users`
- **Verification**:
  - ✓ UsersPage.vue loads
  - ✓ Search input and "Add User" button visible
  - ✓ User table with columns: Name, Email, Role, Status, Actions
  - ✓ Empty state or placeholder table visible

#### 3.7: Admin Audit Logs Page
- **Expected**: `/super-admin/audit-logs` accessible
- **Steps**:
  1. As super_admin, navigate to `/super-admin/audit-logs`
- **Verification**:
  - ✓ AuditLogsPage.vue loads
  - ✓ Filter inputs (user, action, date) visible
  - ✓ Logs table with columns: Timestamp, User, Action, Resource, Status

#### 3.8: Admin System Health Page
- **Expected**: `/super-admin/system-health` accessible
- **Steps**:
  1. As super_admin, navigate to `/super-admin/system-health`
- **Verification**:
  - ✓ SystemHealthPage.vue loads
  - ✓ Service status cards visible: API, Database, Storage, Cache
  - ✓ Each card shows status indicator (green/yellow/gray)
  - ✓ "Refresh Status" button visible

#### 3.9: Admin Cannot Access User Routes
- **Expected**: Super admin accessing `/home` redirects to `/super-admin/dashboard`
- **Steps**:
  1. Login as super_admin
  2. Navigate to `/home`
- **Verification**:
  - ✓ Router checks to.name === 'landing' && isAuthenticated
  - ✓ Redirects to { name: 'admin-dashboard' }

#### 3.10: Admin UserMenu Logout
- **Expected**: Logout works same as normal user
- **Steps**:
  1. As super_admin, click avatar → Sign Out
- **Verification**:
  - ✓ Session cleared
  - ✓ Redirected to `/` (landing page)
  - ✓ AppNavbar shows guest links

---

### 4. ROUTE PROTECTION & GUARDS

#### 4.1: Role-Based Route Protection
- **Expected**: Normal user cannot access `/super-admin/*` routes
- **Steps**:
  1. Login as normal user
  2. Try to navigate to `/super-admin/dashboard`
- **Verification**:
  - ✓ Router checks to.meta.requiresRole === 'super_admin'
  - ✓ Redirects to { name: 'home' } (or current user home)

#### 4.2: Admin Trying to Access User Routes
- **Expected**: Super admin cannot access normal user home
- **Steps**:
  1. Login as super_admin
  2. Manually navigate to `/home`
- **Verification**:
  - ✓ Router beforeEach catches this (landing redirect logic)
  - ✓ Redirects to { name: 'admin-dashboard' }

#### 4.3: Guest Trying to Access Admin Routes
- **Expected**: Guest → `/super-admin/users` redirects to login
- **Steps**:
  1. As guest, navigate to `/super-admin/users`
- **Verification**:
  - ✓ Router checks to.meta.requiresAuth
  - ✓ Redirects to `/login`

#### 4.4: Authenticated Guest Trying to Login Page
- **Expected**: Logged-in user trying to access `/login` redirects to home
- **Steps**:
  1. Login as normal user
  2. Navigate to `/login`
- **Verification**:
  - ✓ Router checks to.meta.guestOnly && isAuthenticated
  - ✓ Redirects to { name: 'home' }

#### 4.5: Authenticated Admin Trying to Register
- **Expected**: Logged-in super_admin trying to `/register` redirects to admin dashboard
- **Steps**:
  1. Login as super_admin
  2. Navigate to `/register`
- **Verification**:
  - ✓ Router checks guestOnly
  - ✓ Redirects based on role to { name: 'admin-dashboard' }

---

### 5. INITIALIZATION FLOW

#### 5.1: App Startup (Auth Probe)
- **Expected**: App probes auth state on startup
- **Steps**:
  1. Logged-in user opens app (browser refresh or new tab with session cookie)
  2. Observe AppLayout loading spinner
- **Verification**:
  - ✓ App.vue onMounted calls auth.initialize()
  - ✓ auth.loading = true initially
  - ✓ AppLayout shows "Loading your archive..." spinner
  - ✓ GET /api/v1/auth/me called (withCredentials: true)
  - ✓ Session cookie sent automatically
  - ✓ After response, auth.initialized = true
  - ✓ Loading spinner disappears
  - ✓ auth.user populated with name, email, role, status

#### 5.2: Existing Session Preserved
- **Expected**: User stays logged in across page refreshes
- **Steps**:
  1. Login as user
  2. Press F5 to refresh page
- **Verification**:
  - ✓ Session cookie persists (HttpOnly)
  - ✓ GET /api/v1/auth/me returns user data
  - ✓ No redirect to login
  - ✓ User stays on current page (after loading)

#### 5.3: No Session (Guest)
- **Expected**: Guest users initialize without error
- **Steps**:
  1. Open app as guest (no session cookie)
  2. Refresh page
- **Verification**:
  - ✓ GET /api/v1/auth/me returns 401
  - ✓ auth.silentApi doesn't throw error (expected 401)
  - ✓ auth.isAuthenticated = false
  - ✓ auth.initialized = true
  - ✓ AppLayout doesn't show spinner (if on landing page)

#### 5.4: Initialization Only Once
- **Expected**: auth.initialize() called only once per app load
- **Steps**:
  1. Login as user
  2. Open browser dev tools → Network tab
  3. Navigate between routes within the app
- **Verification**:
  - ✓ GET /api/v1/auth/me called ONLY on initial app load
  - ✓ Not called again when navigating routes
  - ✓ auth.initialized = true prevents re-probe

---

### 6. DASHBOARD DATA & REAL DATA

#### 6.1: Dashboard Store Fetches Real Data
- **Expected**: HomePage fetches data from GET /api/v1/dashboard on mount
- **Steps**:
  1. Login as normal user
  2. Navigate to `/home`
  3. Open dev tools → Network tab
- **Verification**:
  - ✓ GET /api/v1/dashboard called
  - ✓ Response includes:
    - journal_count, trip_count, memory_count, place_count
    - recent_journals (array of entries)
    - recent_trips (array)
    - on_this_day (array)
  - ✓ Data displayed in HomePage stats section
  - ✓ Recent journals section shows actual entries (or empty state)

#### 6.2: User-Isolated Dashboard Data
- **Expected**: Dashboard data only shows current user's data
- **Steps**:
  1. Create 2 test users (User A, User B)
  2. User A creates 5 journal entries
  3. User B logs in, views `/home`
  4. User B has 0 journal entries shown
- **Verification**:
  - ✓ DashboardController filters by auth()->user()
  - ✓ User B's dashboard is empty
  - ✓ No cross-user data leakage

#### 6.3: Empty State for New Users
- **Expected**: New user with no data sees empty state
- **Steps**:
  1. Create new account (register)
  2. Land on `/home`
- **Verification**:
  - ✓ Recent Journal shows: "Your journal is still empty."
  - ✓ "Write Your First Entry →" link visible
  - ✓ Stats show all 0s: Journal Entries=0, Trips=0, Memories=0, Places=0

---

### 7. AXIOS INTERCEPTORS

#### 7.1: Response Interceptor - 401 Handling
- **Expected**: 401 responses redirect to login with redirect param
- **Steps**:
  1. Login as user
  2. Clear session cookie (dev tools)
  3. Trigger API call (e.g., navigate to page that fetches data)
- **Verification**:
  - ✓ Interceptor catches 401
  - ✓ auth.logout() called (clears state)
  - ✓ router.push({ name: 'login', query: { redirect: ... } })
  - ✓ Redirected to `/login?redirect=<current-route>`

#### 7.2: Response Interceptor - 403 Handling (Normal User)
- **Expected**: 403 redirects normal user to `/home`
- **Steps**:
  1. Login as normal user
  2. Try to access admin-only endpoint (or mock 403 response)
- **Verification**:
  - ✓ Interceptor catches 403
  - ✓ If role='user', redirects to { name: 'home' }

#### 7.3: Response Interceptor - 403 Handling (Admin)
- **Expected**: 403 redirects admin to `/super-admin/dashboard`
- **Steps**:
  1. Login as super_admin
  2. Mock 403 response
- **Verification**:
  - ✓ If role='super_admin', redirects to { name: 'admin-dashboard' }

#### 7.4: withCredentials Always True
- **Expected**: Session cookie sent with every request
- **Steps**:
  1. Login as user
  2. Dev tools → Network → API requests
- **Verification**:
  - ✓ Every API call has Cookie header with session cookie
  - ✓ Proof: api.service.ts sets withCredentials: true globally

---

### 8. EDGE CASES & ERROR HANDLING

#### 8.1: Suspended User Cannot Login
- **Expected**: User with status='suspended' cannot log in
- **Steps**:
  1. Manually set user.status = 'suspended' in DB
  2. Try to login with that user's credentials
- **Verification**:
  - ✓ Backend returns 401 or custom error
  - ✓ Error message: "Account suspended" or similar

#### 8.2: Invalid Redirect Param
- **Expected**: Invalid redirect params are ignored (security)
- **Steps**:
  1. Manually navigate to `/login?redirect=//evil.com`
- **Verification**:
  - ✓ After login, NOT redirected to evil.com
  - ✓ LoginPage checks: redirect.startsWith('/') to allow only local paths
  - ✓ Redirects to default home instead

#### 8.3: Network Error During Initialization
- **Expected**: App handles network errors gracefully
- **Steps**:
  1. Open dev tools → Network tab
  2. Throttle to "Offline" or "Slow 3G"
  3. Refresh page
- **Verification**:
  - ✓ App doesn't crash
  - ✓ Error message shown if needed (or retries)
  - ✓ auth.error contains error message

#### 8.4: Multiple Rapid Logins
- **Expected**: Rate limiting prevents brute force
- **Steps**:
  1. Try to login 6+ times rapidly with wrong password
- **Verification**:
  - ✓ After 5 attempts, returns 429 (Too Many Requests)
  - ✓ LoginPage shows: "Too many login attempts..."
  - ✓ User must wait before retrying

---

## Comprehensive Integration Test

### Full User Journey
1. **Guest lands on app**
   - Opens `/`
   - Sees LandingPage, "Login" and "Create Account" buttons
   - Logo links to `/`

2. **Guest registers**
   - Clicks "Create Account"
   - Fills form (no role selection)
   - Submits
   - Lands on `/home` (dashboard loads with empty state)

3. **User explores**
   - Clicks logo → stays on `/home`
   - Views navbar with Journal, Trips, Memories, Timeline
   - Clicks UserMenu avatar → sees profile, settings, sign out

4. **User logs out**
   - Clicks "Sign Out"
   - Redirected to `/` (landing page)
   - Navbar shows "Login" and "Create Account"

5. **User logs back in**
   - Clicks "Login"
   - Enters credentials
   - Redirected to `/home`
   - Dashboard data loads (real data from MySQL)

6. **Admin pathway** (manual setup via CLI)
   - Create super_admin via command
   - Admin logs in with credentials
   - Redirected to `/super-admin/dashboard`
   - Navbar shows: Dashboard, Users, Audit Logs, System Health
   - Logo links to `/super-admin/dashboard`

7. **Admin explores**
   - Visits `/super-admin/users`, `/super-admin/audit-logs`, `/super-admin/system-health`
   - Views UserMenu → "Admin Dashboard" link present
   - Logs out → redirected to `/`

---

## Success Criteria

### All scenarios must pass:
- [ ] 8 guest scenarios (landing, redirects, protected routes)
- [ ] 8 normal user scenarios (registration, login, dashboard, logo, navbar, logout, session, redirect)
- [ ] 10 super admin scenarios (login, logo, navbar, 4 admin pages, role protection, logout, redirect)
- [ ] 5 route protection scenarios
- [ ] 4 initialization scenarios
- [ ] 3 dashboard data scenarios
- [ ] 4 axios interceptor scenarios
- [ ] 4 edge cases
- [ ] 1 comprehensive journey

**Total: 51 test points**

---

## Manual Testing Checklist

### Prerequisites
- [ ] Database seeded with test users (1 normal user, 1 super_admin)
- [ ] Backend running: `php artisan serve`
- [ ] Frontend dev server running: `npm run dev`
- [ ] Browser dev tools open (Network, Console, Application tabs)

### Testing Environment
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Edge (latest)
- [ ] Test on mobile/tablet (responsive design)

### Automated Tests (Optional)
- [ ] E2E tests with Playwright/Cypress
- [ ] Unit tests for stores (auth, dashboard)
- [ ] Integration tests for API endpoints

---

## Sign-Off

**Date**: [Date]
**Tested By**: [Name]
**Environment**: [Dev/Staging/Production]
**Status**: ✓ PASSED / ✗ FAILED

---

## Notes
- All tests assume HTTPS in production (secure session cookies)
- Session timeout configured: [check Laravel config]
- CSRF protection enabled: [verify middleware]
- Role-based access control enforced: [verify policies]
