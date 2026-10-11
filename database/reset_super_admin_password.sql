-- ============================================================
-- RESET SUPER ADMIN PASSWORD HELPER
-- ============================================================
-- This file provides instructions for resetting Super Admin password
-- 
-- IMPORTANT: Passwords cannot be changed directly via SQL for security.
-- Use one of the methods below.
-- ============================================================

-- METHOD 1: Find Super Admin Email
-- Run this first to identify the Super Admin account
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  p.role,
  u.created_at
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE p.role = 'super_admin';

-- ============================================================
-- After getting the email, use one of these methods:
-- ============================================================

-- OPTION A: Supabase Dashboard (RECOMMENDED)
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Search for the email from query above
-- 3. Click on the user
-- 4. Click "Reset password" button
-- 5. Enter new password
-- 6. Save

-- OPTION B: Send Password Reset Email (if email is configured)
-- 1. Go to your Cronevia app at /forgot-password
-- 2. Enter the Super Admin email
-- 3. Check email inbox for reset link
-- 4. Click link and set new password

-- OPTION C: Replace Super Admin (Emergency Only)
-- If you can't access the current Super Admin account,
-- you can replace it with another user:
-- 
-- SELECT replace_super_admin(
--   'new-admin-email@example.com',
--   'REPLACE_SUPER_ADMIN'
-- );
-- 
-- This will:
-- 1. Demote current Super Admin to regular user
-- 2. Promote new user to Super Admin
-- 3. You can then login with the new admin's credentials

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After changing password, verify you can login:
-- 1. Go to your Cronevia app
-- 2. Login with the Super Admin email and NEW password
-- 3. Navigate to /admin
-- 4. You should see the Admin Dashboard

-- ============================================================
-- SECURITY NOTES
-- ============================================================
-- ⚠️ Never share Super Admin credentials
-- ⚠️ Use a strong password (12+ characters)
-- ⚠️ Store password in secure password manager
-- ⚠️ Change password if compromised
-- ⚠️ Monitor audit logs regularly

-- ============================================================
