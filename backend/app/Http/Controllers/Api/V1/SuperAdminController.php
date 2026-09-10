<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * SuperAdminController - Endpoints for Super Admin dashboard and system management.
 *
 * SECURITY CRITICAL:
 * - All endpoints require EnsureSuperAdmin middleware
 * - Uses SuperAdminPolicy for authorization checks
 * - Returns 403 Forbidden for unauthorized access
 * - All operations are logged/audited
 * - No sensitive database credentials exposed
 */
class SuperAdminController extends Controller
{
    /**
     * Get Super Admin dashboard data.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function dashboard(Request $request)
    {
        $this->authorize('viewAdminDashboard', User::class);

        $user = $request->user();

        // System statistics
        $totalUsers = User::count();
        $superAdminCount = User::superAdminCount();
        $normalUsersCount = User::where('role', 'user')->count();
        $activeUsers = User::where('status', 'active')->count();
        $inactiveUsers = User::where('status', 'inactive')->count();
        $suspendedUsers = User::where('status', 'suspended')->count();

        // Application statistics
        $tripCount = DB::table('trips')->count();
        $journalCount = DB::table('journal_entries')->count();
        $memoryCount = DB::table('memories')->count();
        $mediaCount = DB::table('media')->count();

        return response()->json([
            'data' => [
                'super_admin' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                ],
                'system' => [
                    'total_users' => $totalUsers,
                    'super_admin_count' => $superAdminCount,
                    'normal_users' => $normalUsersCount,
                    'status_breakdown' => [
                        'active' => $activeUsers,
                        'inactive' => $inactiveUsers,
                        'suspended' => $suspendedUsers,
                    ],
                ],
                'application' => [
                    'trips' => $tripCount,
                    'journal_entries' => $journalCount,
                    'memories' => $memoryCount,
                    'media_items' => $mediaCount,
                ],
                'environment' => [
                    'app_env' => config('app.env'),
                    'app_debug' => config('app.debug'),
                ],
            ],
        ]);
    }

    /**
     * Get list of all users.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function listUsers(Request $request)
    {
        $this->authorize('manageUsers', User::class);

        $perPage = $request->query('per_page', 15);
        $search = $request->query('search');
        $role = $request->query('role');
        $status = $request->query('status');

        $query = User::query();

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
        }

        if ($role && in_array($role, ['user', 'super_admin'])) {
            $query->where('role', $role);
        }

        if ($status && in_array($status, ['active', 'inactive', 'suspended'])) {
            $query->where('status', $status);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $users->items(),
            'pagination' => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    /**
     * Get a specific user's details.
     *
     * @param User $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function showUser(User $user)
    {
        $this->authorize('manageUsers', User::class);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'avatar_path' => $user->avatar_path,
                'timezone' => $user->timezone,
                'locale' => $user->locale,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
        ]);
    }

    /**
     * Suspend a user account.
     *
     * @param Request $request
     * @param User $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function suspendUser(Request $request, User $user)
    {
        $this->authorize('suspend', $user);

        if ($user->status === 'suspended') {
            return response()->json([
                'message' => 'User is already suspended.',
            ], 422);
        }

        $user->update(['status' => 'suspended']);

        // Log the suspension
        AuditService::logUserSuspended($request->user(), $user, $request);

        return response()->json([
            'message' => 'User suspended successfully.',
            'data' => $user,
        ]);
    }

    /**
     * Reactivate a suspended user account.
     *
     * @param Request $request
     * @param User $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function reactivateUser(Request $request, User $user)
    {
        $this->authorize('manageUsers', User::class);

        if ($user->status === 'active') {
            return response()->json([
                'message' => 'User is already active.',
            ], 422);
        }

        $user->update(['status' => 'active']);

        // Log the reactivation
        AuditService::logUserReactivated($request->user(), $user, $request);

        return response()->json([
            'message' => 'User reactivated successfully.',
            'data' => $user,
        ]);
    }

    /**
     * Delete a user account (hard delete or soft delete).
     *
     * @param Request $request
     * @param User $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteUser(Request $request, User $user)
    {
        $this->authorize('delete', $user);

        $email = $user->email;

        // Log the deletion
        AuditService::logUserDeleted($request->user(), $user, $request);

        $user->delete();

        return response()->json([
            'message' => "User '{$email}' deleted successfully.",
        ]);
    }

    /**
     * Get database health/status information.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function databaseStatus(Request $request)
    {
        $this->authorize('manageDatabaseTools', User::class);

        try {
            DB::connection()->getPdo();
            $dbConnected = true;
            $dbStatus = 'Connected';
        } catch (\Exception $e) {
            $dbConnected = false;
            $dbStatus = 'Connection Failed: ' . $e->getMessage();
        }

        // Get table counts (non-sensitive information only)
        $tableInfo = [
            'users' => DB::table('users')->count(),
            'trips' => DB::table('trips')->count(),
            'journal_entries' => DB::table('journal_entries')->count(),
            'memories' => DB::table('memories')->count(),
            'media' => DB::table('media')->count(),
        ];

        return response()->json([
            'data' => [
                'database' => [
                    'connected' => $dbConnected,
                    'status' => $dbStatus,
                    'tables' => $tableInfo,
                ],
            ],
        ]);
    }

    /**
     * Get system health information.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function systemHealth(Request $request)
    {
        $this->authorize('viewSystemHealth', User::class);

        return response()->json([
            'data' => [
                'app' => [
                    'name' => config('app.name'),
                    'env' => config('app.env'),
                    'debug' => config('app.debug'),
                    'url' => config('app.url'),
                ],
                'php' => [
                    'version' => phpversion(),
                ],
                'laravel' => [
                    'version' => app()->version(),
                ],
                'timestamp' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get audit logs.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function auditLogs(Request $request)
    {
        $this->authorize('viewAuditLogs', User::class);

        $perPage = $request->query('per_page', 50);
        $eventType = $request->query('event_type');
        $userId = $request->query('user_id');

        $query = \App\Models\AuditLog::query();

        if ($eventType) {
            $query->where('event_type', $eventType);
        }

        if ($userId) {
            $query->where('user_id', $userId)
                ->orWhere('target_user_id', $userId);
        }

        $logs = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'pagination' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }

    /**
     * Get security information and monitoring.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function securityStatus(Request $request)
    {
        $this->authorize('viewSecurityLogs', User::class);

        return response()->json([
            'data' => [
                'security' => [
                    'https_enabled' => config('app.url') ? str_starts_with(config('app.url'), 'https') : false,
                    'session_driver' => config('session.driver'),
                    'session_secure_cookie' => config('session.secure') ?? false,
                    'session_http_only' => config('session.http_only') ?? true,
                    'session_same_site' => config('session.same_site') ?? 'lax',
                ],
                'recommendations' => [
                    'enable_mfa' => 'Multi-Factor Authentication support is recommended',
                    'monitor_logs' => 'Regularly monitor audit and security logs',
                    'keep_updated' => 'Keep Laravel and dependencies updated',
                ],
            ],
        ]);
    }
}
