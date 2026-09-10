<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * AuditService - Centralized service for logging security-critical events.
 *
 * SECURITY CRITICAL:
 * - Never logs passwords or sensitive credentials
 * - Records IP address for security monitoring
 * - Tracks all Super Admin events
 * - Provides audit trail for compliance
 *
 * Usage:
 *   AuditService::logSuperAdminCreated($user, $request);
 *   AuditService::logSuperAdminLogin($user, $request);
 *   AuditService::logUserSuspended($admin, $targetUser, $request);
 */
class AuditService
{
    /**
     * Log Super Admin account creation.
     */
    public static function logSuperAdminCreated(User $user, Request $request = null): void
    {
        self::log(
            eventType: 'super_admin_created',
            userId: $user->id,
            targetUserId: $user->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
            ],
        );
    }

    /**
     * Log Super Admin account replacement.
     */
    public static function logSuperAdminReplaced(User $oldAdmin, User $newAdmin, Request $request = null): void
    {
        self::log(
            eventType: 'super_admin_replaced',
            userId: null,  // No authenticated user (CLI command)
            targetUserId: $oldAdmin->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'old_admin_email' => $oldAdmin->email,
                'new_admin_email' => $newAdmin->email,
                'old_admin_status' => 'suspended',
            ],
        );
    }

    /**
     * Log Super Admin successful login.
     */
    public static function logSuperAdminLogin(User $user, Request $request = null): void
    {
        self::log(
            eventType: 'super_admin_login',
            userId: $user->id,
            targetUserId: $user->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'email' => $user->email,
                'timestamp' => now()->toIso8601String(),
            ],
        );
    }

    /**
     * Log Super Admin failed login attempt.
     */
    public static function logSuperAdminLoginFailed(string $email, Request $request = null): void
    {
        self::log(
            eventType: 'super_admin_login_failed',
            userId: null,
            targetUserId: null,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'email' => $email,
                'timestamp' => now()->toIso8601String(),
            ],
        );
    }

    /**
     * Log user suspension.
     */
    public static function logUserSuspended(User $admin, User $suspendedUser, Request $request = null): void
    {
        self::log(
            eventType: 'user_suspended',
            userId: $admin->id,
            targetUserId: $suspendedUser->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'admin_email' => $admin->email,
                'target_email' => $suspendedUser->email,
                'reason' => 'Admin action',
            ],
        );
    }

    /**
     * Log user reactivation.
     */
    public static function logUserReactivated(User $admin, User $reactivatedUser, Request $request = null): void
    {
        self::log(
            eventType: 'user_reactivated',
            userId: $admin->id,
            targetUserId: $reactivatedUser->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'admin_email' => $admin->email,
                'target_email' => $reactivatedUser->email,
            ],
        );
    }

    /**
     * Log user deletion.
     */
    public static function logUserDeleted(User $admin, User $deletedUser, Request $request = null): void
    {
        self::log(
            eventType: 'user_deleted',
            userId: $admin->id,
            targetUserId: $deletedUser->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'admin_email' => $admin->email,
                'deleted_email' => $deletedUser->email,
                'deleted_name' => $deletedUser->name,
            ],
        );
    }

    /**
     * Log role change.
     */
    public static function logRoleChanged(User $admin, User $targetUser, string $oldRole, string $newRole, Request $request = null): void
    {
        self::log(
            eventType: 'role_changed',
            userId: $admin->id,
            targetUserId: $targetUser->id,
            ipAddress: $request?->ip(),
            userAgent: $request?->userAgent(),
            data: [
                'admin_email' => $admin->email,
                'target_email' => $targetUser->email,
                'old_role' => $oldRole,
                'new_role' => $newRole,
            ],
        );
    }

    /**
     * Generic log method.
     */
    private static function log(
        string $eventType,
        ?string $userId = null,
        ?string $targetUserId = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?array $data = null,
    ): void {
        try {
            AuditLog::create([
                'event_type' => $eventType,
                'user_id' => $userId,
                'target_user_id' => $targetUserId,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'data' => $data,
                'environment' => config('app.env'),
            ]);
        } catch (\Exception $e) {
            // Log to Laravel error log if audit logging fails
            logger()->error('Audit logging failed: ' . $e->getMessage(), [
                'event_type' => $eventType,
                'exception' => $e,
            ]);
        }
    }
}
