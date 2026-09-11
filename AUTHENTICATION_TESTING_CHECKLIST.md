# CRONEVIA Authentication Testing Checklist

Complete checklist for testing Supabase authentication implementation.

**Date**: September 10, 2026  
**Phase**: Authentication Migration (Phase 1)  

---

## Pre-Testing Setup

Before running tests, ensure:

- ✅ Supabase project created
- ✅ `supabase_schema.sql` executed
- ✅ `supabase_rls_policies.sql` executed
- ✅ Frontend `.env` configured with Supabase credentials
- ✅ `npm install` completed
- ✅ Dev server running (`npm run dev`)

---

## Test Suite 1: User Registration

### Test 1.1: Successful Registration

**Steps:**
1. Navigate to http://localhost:5173
2. Click "Create one" or go to `/register`
3. Fill in form:
   - Full Name: `Test User`
   - Email: `test1@example.com`
   - Password: `Test1234!`
   - Confirm Password: `Test1234!`
4. Click "Create Account"

**Expected Results:**
- ✅ No errors shown
- ✅ Loading state displayed
- ✅ Redirected to `/` (home page) OR email confirmation message shown
- ✅ User appears in Supabase Auth dashboard
- ✅ Profile auto-created in `profiles` table with `role = 'user'`
- ✅ User settings auto-created in `user_settings` table

**Verification SQL:**
```sql
SELECT u.email, p.full_name, p.role, p.account_status
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'test1@example.com';
```

### Test 1.2: Validation - Empty Fields

**Steps:**
1. Go to `/register`
2. Leave all fields empty
3. Click "Create Account"

**Expected Results:**
- ✅ HTML5 validation prevents submission
- ✅ "Please fill in all fields" message may appear

### Test 1.3: Validation - Password Too Short

**Steps:**
1. Go to `/register`
2. Enter password: `Test1!`
3. Click "Create Account"

**Expected Results:**
- ✅ Error message: "Password must be at least 8 characters long"

### Test 1.4: Validation - Passwords Don't Match

**Steps:**
1. Go to `/register`
2. Password: `Test1234!`
3. Confirm: `Different123!`
4. Click "Create Account"

**Expected Results:**
- ✅ Error message: "Passwords do not match"

### Test 1.5: Duplicate Email

**Steps:**
1. Try to register with `test1@example.com` again

**Expected Results:**
- ✅ Error message from Supabase (e.g., "User already registered")

### Test 1.6: Role Security - Cannot Self-Assign Admin

**Verification SQL:**
```sql
-- All registrations through frontend should have role='user'
SELECT role FROM profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test%@example.com'
);
```

**Expected Results:**
- ✅ All roles should be `'user'`
- ✅ No `'super_admin'` roles from frontend registration

---

## Test Suite 2: User Login

### Test 2.1: Successful Login

**Steps:**
1. Navigate to `/login`
2. Enter credentials:
   - Email: `test1@example.com`
   - Password: `Test1234!`
3. Click "Sign In"

**Expected Results:**
- ✅ No errors shown
- ✅ Loading state displayed
- ✅ Redirected to `/` (home)
- ✅ User data loaded in browser (check Vue DevTools)
- ✅ Session persisted (check localStorage for `supabase.auth.token`)

### Test 2.2: Invalid Email

**Steps:**
1. Go to `/login`
2. Email: `nonexistent@example.com`
3. Password: `anything`
4. Click "Sign In"

**Expected Results:**
- ✅ Error message: "Invalid login credentials" or similar

### Test 2.3: Invalid Password

**Steps:**
1. Go to `/login`
2. Email: `test1@example.com`
3. Password: `WrongPassword123!`
4. Click "Sign In"

**Expected Results:**
- ✅ Error message: "Invalid login credentials" or similar

### Test 2.4: Empty Fields

**Steps:**
1. Leave fields empty
2. Click "Sign In"

**Expected Results:**
- ✅ HTML5 validation or error message

### Test 2.5: Session Persistence

**Steps:**
1. Log in successfully
2. Refresh the page (F5)

**Expected Results:**
- ✅ Still logged in
- ✅ No redirect to login page
- ✅ User data still available

### Test 2.6: Redirect After Login

**Steps:**
1. Log out
2. Try to visit `/journal`
3. Should redirect to `/login?redirect=/journal`
4. Log in

**Expected Results:**
- ✅ Redirected to `/journal` (the intended destination)

---

## Test Suite 3: User Logout

### Test 3.1: Successful Logout

**Steps:**
1. Log in as any user
2. Navigate to home or any authenticated page
3. Click "Logout" (implement in navbar if not present)

**Expected Results:**
- ✅ Session cleared
- ✅ Redirected to `/` or `/login`
- ✅ User data cleared from store
- ✅ localStorage cleared (`supabase.auth.token` removed)

### Test 3.2: Cannot Access Protected Routes After Logout

**Steps:**
1. After logout, try to visit `/journal`

**Expected Results:**
- ✅ Redirected to `/login`

### Test 3.3: Logout Across Tabs

**Steps:**
1. Open app in two browser tabs
2. Log in on both
3. Log out in Tab 1
4. Check Tab 2

**Expected Results:**
- ✅ Tab 2 should also detect logout (Supabase auth state sync)

---

## Test Suite 4: Protected Routes

### Test 4.1: Unauthenticated Access

**Steps:**
1. Ensure logged out
2. Try to visit each protected route:
   - `/journal`
   - `/trips`
   - `/memories`
   - `/profile`
   - `/settings`
   - `/admin`

**Expected Results:**
- ✅ All redirect to `/login`
- ✅ Redirect URL preserved in query (`?redirect=/journal`)

### Test 4.2: Authenticated Access

**Steps:**
1. Log in as regular user
2. Visit each route above (except `/admin`)

**Expected Results:**
- ✅ All routes accessible
- ✅ No redirects

### Test 4.3: Guest Routes When Authenticated

**Steps:**
1. While logged in, try to visit:
   - `/login`
   - `/register`

**Expected Results:**
- ✅ Redirected to `/` (home)

---

## Test Suite 5: Super Admin

### Test 5.1: Create Super Admin

**Steps:**
1. In Supabase SQL Editor, run:
   ```sql
   SELECT promote_to_super_admin('admin@cronevia.local');
   ```

**Expected Results:**
- ✅ Returns: `SUCCESS: User promoted to Super Admin`

**Verification:**
```sql
SELECT email, role FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'super_admin';
```

### Test 5.2: Admin Dashboard Access

**Steps:**
1. Log in as super admin
2. Navigate to `/admin`

**Expected Results:**
- ✅ Admin Dashboard displayed
- ✅ Shows admin name and email
- ✅ "SUPER ADMIN" badge visible
- ✅ Placeholder admin features shown

### Test 5.3: Regular User Cannot Access Admin

**Steps:**
1. Log in as regular user (not admin)
2. Try to navigate to `/admin`

**Expected Results:**
- ✅ Redirected to `/` (home)
- ✅ Cannot see admin dashboard

### Test 5.4: Only One Super Admin Allowed

**Steps:**
1. Try to create second super admin:
   ```sql
   SELECT promote_to_super_admin('test1@example.com');
   ```

**Expected Results:**
- ✅ Error: "Super Admin already exists. Only one Super Admin is allowed."

---

## Test Suite 6: Password Reset

### Test 6.1: Request Password Reset

**Steps:**
1. Log out
2. Go to `/login`
3. Click "Forgot your password?"
4. Enter email: `test1@example.com`
5. Click "Send Reset Link"

**Expected Results:**
- ✅ Success message shown
- ✅ Email sent (check inbox or Supabase logs)
- ✅ Reset link contains token

### Test 6.2: Invalid Email

**Steps:**
1. Request reset for `nonexistent@example.com`

**Expected Results:**
- ✅ Success message shown (for security, don't reveal if email exists)
- ✅ No email actually sent

### Test 6.3: Reset Password with Link

**Steps:**
1. Click the reset link from email
2. Should open `/reset-password`
3. Enter new password: `NewPassword123!`
4. Confirm password
5. Click "Reset Password"

**Expected Results:**
- ✅ Success message shown
- ✅ Can now log in with new password
- ✅ Cannot log in with old password

---

## Test Suite 7: Profile Management

### Test 7.1: View Own Profile

**Steps:**
1. Log in
2. Navigate to `/profile`

**Expected Results:**
- ✅ Profile page loads
- ✅ Shows user's full name
- ✅ Shows user's email
- ✅ Shows avatar placeholder or uploaded avatar

### Test 7.2: Update Profile

**Steps:**
1. On profile page, update full name
2. Save changes

**Expected Results:**
- ✅ Success message
- ✅ Name updated in database
- ✅ Name reflected in UI immediately

**Verification SQL:**
```sql
SELECT full_name FROM profiles WHERE user_id = 'your-user-id';
```

---

## Test Suite 8: Account Status

### Test 8.1: Suspended Account Cannot Login

**Steps:**
1. Suspend a test account:
   ```sql
   UPDATE profiles 
   SET account_status = 'suspended' 
   WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'test1@example.com'
   );
   ```
2. Try to log in as that user

**Expected Results:**
- ✅ Login succeeds at Supabase level
- ✅ Auth store detects suspended status
- ✅ Automatically logs out
- ✅ Error message: "Your account is suspended"

### Test 8.2: Reactivate Account

**Steps:**
1. Reactivate the account:
   ```sql
   UPDATE profiles 
   SET account_status = 'active' 
   WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'test1@example.com'
   );
   ```
2. Try to log in

**Expected Results:**
- ✅ Login successful
- ✅ Access granted to protected routes

---

## Test Suite 9: Security - Row Level Security

### Test 9.1: User Cannot Read Other User's Data

**Setup:**
1. Create User A: `usera@example.com`
2. Create User B: `userb@example.com`
3. As User A, create a journal entry (placeholder for now)

**Test:**
1. Log in as User B
2. Try to query User A's data in browser console:
   ```javascript
   const { data } = await supabase
     .from('journal_entries')
     .select('*')
   console.log(data) // Should only show User B's entries
   ```

**Expected Results:**
- ✅ User B cannot see User A's journal entries
- ✅ RLS policies enforcing isolation

### Test 9.2: User Cannot Modify Role

**Test:**
1. Log in as regular user
2. In browser console:
   ```javascript
   const { data, error } = await supabase
     .from('profiles')
     .update({ role: 'super_admin' })
     .eq('user_id', supabase.auth.user().id)
   console.log(error) // Should show policy violation
   ```

**Expected Results:**
- ✅ Update fails
- ✅ Error: Policy violation
- ✅ Role remains `'user'`

---

## Test Suite 10: Browser Compatibility

Test on multiple browsers:

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if on Mac)

For each browser, verify:
- Registration works
- Login works
- Session persists
- Logout works

---

## Test Suite 11: Network Conditions

### Test 11.1: Offline Behavior

**Steps:**
1. Open browser DevTools
2. Set network to "Offline"
3. Try to log in

**Expected Results:**
- ✅ Error message displayed
- ✅ Graceful failure (no crash)

### Test 11.2: Slow Network

**Steps:**
1. Set network to "Slow 3G"
2. Try to register or login

**Expected Results:**
- ✅ Loading states visible
- ✅ Eventually succeeds or times out gracefully

---

## Test Suite 12: Edge Cases

### Test 12.1: Rapid Repeated Requests

**Steps:**
1. Click "Login" button 5 times rapidly

**Expected Results:**
- ✅ Button disabled during loading
- ✅ No duplicate requests
- ✅ Single success or error

### Test 12.2: Session Expiry

**Steps:**
1. Log in
2. Wait for session to expire (or manually delete token)
3. Try to access protected route

**Expected Results:**
- ✅ Redirected to login
- ✅ Graceful session refresh if token still valid

### Test 12.3: Invalid Token in LocalStorage

**Steps:**
1. Log in
2. Manually corrupt the token in localStorage
3. Refresh page

**Expected Results:**
- ✅ Logged out automatically
- ✅ Redirected to login if on protected route

---

## Final Verification Checklist

After completing all tests:

### Database
- [ ] All 17 tables exist
- [ ] RLS enabled on all tables
- [ ] Triggers working (profile auto-creation)
- [ ] Super admin created and verified

### Authentication
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] Session persistence works

### Authorization
- [ ] Protected routes require login
- [ ] Admin routes require super_admin
- [ ] Regular users cannot access admin pages
- [ ] Suspended accounts cannot login

### Security
- [ ] RLS prevents cross-user data access
- [ ] Users cannot self-promote to admin
- [ ] Service role key not in frontend
- [ ] Anon key in frontend (safe)

### User Experience
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly
- [ ] Redirects work properly
- [ ] Forms validate properly
- [ ] Design matches Cronevia vintage aesthetic

---

## Known Limitations (To Be Implemented Later)

- [ ] Journal features (reading, creating entries)
- [ ] Trip features (planning, itinerary)
- [ ] Memory features (creating, archiving)
- [ ] File uploads (photos)
- [ ] Admin user management UI
- [ ] Email templates customization
- [ ] Two-factor authentication (optional)

---

## Test Results Template

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| 1.1 | Successful Registration | ☐ Pass ☐ Fail | |
| 1.2 | Validation - Empty Fields | ☐ Pass ☐ Fail | |
| 1.3 | Validation - Short Password | ☐ Pass ☐ Fail | |
| ... | ... | ... | |

---

## Sign-Off

**Tester Name**: _________________  
**Date**: _________________  
**Environment**: Development / Staging / Production  
**All Tests Passed**: Yes / No  

**Notes**: 
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

**Testing Complete!** 

If all tests pass, the authentication layer is ready for production deployment.

Next phase: Migrate Journal, Trips, and Memories features to Supabase.
