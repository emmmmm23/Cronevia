<?php

namespace App\Policies;

use App\Models\User;

/**
 * SuperAdminPolicy - Authorization policy for Super Admin-only resources.
 *
 * SECURITY CRITICAL:
 * - Enforces that only Super Admin can access certain resources
 * - Used with Laravel's authorization gate system
 * - Prevents normal users from managing admin resources
 * - Prevents role escalation or privilege modification
 *
 * Usage in controllers:
 *   $this->authorize('viewAdminDashboard', User::class);
 *   $this->authorize('manageUsers', User::class);
 */
class SuperAdminPolicy
{
    /**
     * Determine if the user can view the admin dashboard.
     */
    public function viewAdminDashboard(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can manage users (view, edit, suspend, etc.).
     */
    public function manageUsers(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can manage system settings.
     */
    public function manageSettings(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can view audit logs.
     */
    public function viewAuditLogs(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can access database management.
     */
    public function manageDatabaseTools(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can manage backups.
     */
    public function manageBackups(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can view security logs.
     */
    public function viewSecurityLogs(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can manage system health.
     */
    public function viewSystemHealth(User $user): bool
    {
        return $user->isSuperAdmin() && $user->isActive();
    }

    /**
     * Determine if the user can modify any user's profile.
     * Super Admin can only modify their own profile or other user accounts for admin purposes.
     */
    public function modify(User $user, User $model): bool
    {
        // Only Super Admin can modify any user
        if (!$user->isSuperAdmin()) {
            return false;
        }

        // Super Admin account itself cannot be modified to remove Super Admin status
        if ($model->isSuperAdmin() && $user->id !== $model->id) {
            return false;
        }

        return $user->isActive();
    }

    /**
     * Determine if the user can delete a user.
     * Super Admin account cannot be deleted.
     */
    public function delete(User $user, User $model): bool
    {
        // Only Super Admin can delete users
        if (!$user->isSuperAdmin()) {
            return false;
        }

        // Cannot delete Super Admin account
        if ($model->isSuperAdmin()) {
            return false;
        }

        return $user->isActive();
    }

    /**
     * Determine if the user can suspend a user.
     * Super Admin account cannot be suspended.
     */
    public function suspend(User $user, User $model): bool
    {
        // Only Super Admin can suspend users
        if (!$user->isSuperAdmin()) {
            return false;
        }

        // Cannot suspend Super Admin account
        if ($model->isSuperAdmin()) {
            return false;
        }

        return $user->isActive();
    }

    /**
     * Determine if the user can change a user's role.
     * Only Super Admin can change roles, and cannot change Super Admin role.
     */
    public function changeRole(User $user, User $model): bool
    {
        // Only Super Admin can change roles
        if (!$user->isSuperAdmin()) {
            return false;
        }

        // Cannot change Super Admin role (protect the sole super admin)
        if ($model->isSuperAdmin()) {
            return false;
        }

        return $user->isActive();
    }
}
