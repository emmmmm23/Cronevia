<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        // SECURITY CRITICAL: Always assign role = 'user' for normal registration.
        // Super Admin provisioning is server-side only via Artisan command.
        // The 'role' field from the request is NEVER accepted.
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'user',  // Explicitly set to 'user', cannot be overridden by frontend
            'status' => 'active',
        ]);

        Auth::login($user);

        return response()->json([
            'message' => 'Registration successful.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_path' => $user->avatar_path,
                'timezone' => $user->timezone,
                'locale' => $user->locale,
                'role' => $user->role,  // Include role in response for frontend awareness
                'status' => $user->status,
                'created_at' => $user->created_at,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $request->session()->regenerate();

        $user = $request->user();

        return response()->json([
            'message' => 'Login successful.',
            'user' => [
                'id' => $user?->id,
                'name' => $user?->name,
                'email' => $user?->email,
                'avatar_path' => $user?->avatar_path,
                'timezone' => $user?->timezone,
                'locale' => $user?->locale,
                'status' => $user?->status,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Explicitly clear the session cookie to ensure logout is complete
        return response()->json(['message' => 'Logged out.'])
            ->withoutCookie(config('session.cookie'));
    }

    public function me(Request $request)
    {
        $user = $request->user();

        // Real stats – counted from the database, never hardcoded
        $journalCount = $user->journalEntries()->count();
        $tripCount    = $user->trips()->count();
        $memoryCount  = $user->memories()->count();
        $placeCount   = $user->journalEntries()
            ->whereNotNull('location_name')
            ->distinct('location_name')
            ->count('location_name');

        return response()->json([
            'data' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'avatar_path' => $user->avatar_path,
                'timezone'   => $user->timezone,
                'locale'     => $user->locale,
                'role'       => $user->role,  // Include role for frontend authorization checks
                'status'     => $user->status,
                'created_at' => $user->created_at,
                'stats'      => [
                    'journal_entries' => $journalCount,
                    'trips'           => $tripCount,
                    'memories'        => $memoryCount,
                    'places'          => $placeCount,
                ],
            ],
        ]);
    }

    /**
     * Update the authenticated user's profile information.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'timezone' => ['sometimes', 'nullable', 'string', 'max:100'],
            'locale' => ['sometimes', 'nullable', 'string', 'max:10'],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_path' => $user->avatar_path,
                'timezone' => $user->timezone,
                'locale' => $user->locale,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * Upload profile photo for the authenticated user.
     * Stores in media table and updates user.avatar_path.
     */
    public function uploadProfilePhoto(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'], // 10MB max
        ]);

        $file = $validated['photo'];

        // Security: Verify file is actually an image
        $mimeType = mime_content_type($file->getRealPath());
        if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'])) {
            return response()->json([
                'message' => 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.',
            ], 422);
        }

        // Store the file
        $path = $file->store('profile-photos', 'public');
        $url = asset('storage/' . $path);

        // Delete old profile photo if exists
        if ($user->avatar_path) {
            $oldPath = str_replace(asset('storage/'), '', $user->avatar_path);
            if (\Storage::disk('public')->exists($oldPath)) {
                \Storage::disk('public')->delete($oldPath);
            }
        }

        // Update user's avatar_path
        $user->update(['avatar_path' => $url]);

        return response()->json([
            'message' => 'Profile photo uploaded successfully.',
            'data' => [
                'avatar_path' => $url,
            ],
        ]);
    }

    /**
     * Remove the authenticated user's profile photo.
     */
    public function deleteProfilePhoto(Request $request)
    {
        $user = $request->user();

        if (!$user->avatar_path) {
            return response()->json([
                'message' => 'No profile photo to delete.',
            ], 404);
        }

        // Delete the file from storage
        $oldPath = str_replace(asset('storage/'), '', $user->avatar_path);
        if (\Storage::disk('public')->exists($oldPath)) {
            \Storage::disk('public')->delete($oldPath);
        }

        // Clear avatar_path
        $user->update(['avatar_path' => null]);

        return response()->json([
            'message' => 'Profile photo deleted successfully.',
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        // Verify current password
        if (!Hash::check($validated['current_password'], $user->password_hash)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
                'errors' => ['current_password' => ['Current password is incorrect.']],
            ], 422);
        }

        // Update password
        $user->update(['password' => $validated['new_password']]);

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Update the authenticated user's email.
     * Requires password confirmation for security.
     */
    public function changeEmail(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['required', 'string'],
        ]);

        // Verify password
        if (!Hash::check($validated['password'], $user->password_hash)) {
            return response()->json([
                'message' => 'Password is incorrect.',
                'errors' => ['password' => ['Password is incorrect.']],
            ], 422);
        }

        // Update email
        $user->update(['email' => $validated['email']]);

        return response()->json([
            'message' => 'Email changed successfully.',
            'data' => [
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Delete the authenticated user's account.
     * SECURITY CRITICAL: Requires password confirmation and explicit confirmation text.
     * Permanently deletes user and all related data through cascade constraints.
     */
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        // SECURITY: Never allow Super Admin deletion through this endpoint
        if ($user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin accounts cannot be deleted through this method. Please use console commands.',
            ], 403);
        }

        $validated = $request->validate([
            'password' => ['required', 'string'],
            'confirmation' => ['required', 'string', 'in:DELETE'],
        ]);

        // Verify password
        if (!Hash::check($validated['password'], $user->password_hash)) {
            return response()->json([
                'message' => 'Password is incorrect.',
                'errors' => ['password' => ['Password is incorrect.']],
            ], 422);
        }

        // Verify confirmation text
        if ($validated['confirmation'] !== 'DELETE') {
            return response()->json([
                'message' => 'Confirmation text must be "DELETE".',
                'errors' => ['confirmation' => ['Please type DELETE to confirm.']],
            ], 422);
        }

        // Log out the user before deletion
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Delete the user (cascades to all related data through foreign key constraints)
        $user->delete();

        return response()->json([
            'message' => 'Account deleted successfully.',
        ])->withoutCookie(config('session.cookie'));
    }
}
