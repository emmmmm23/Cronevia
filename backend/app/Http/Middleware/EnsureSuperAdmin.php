<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to ensure the authenticated user is a Super Admin.
 *
 * SECURITY CRITICAL:
 * - Verifies authentication server-side
 * - Checks user role is 'super_admin'
 * - Ensures user account is active
 * - Returns 403 Forbidden for unauthorized access
 * - Does NOT rely on frontend/localStorage state
 *
 * Usage in routes:
 *   Route::middleware(['auth', 'super_admin'])->group(function () {
 *       // Admin-only routes
 *   });
 */
class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // User must be authenticated
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // User must have super_admin role
        if (!$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Super Admin access required.',
            ], 403);
        }

        // User account must be active
        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Forbidden. Super Admin account is not active.',
            ], 403);
        }

        return $next($request);
    }
}
