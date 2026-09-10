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

        // Real stats — counted from the database, never hardcoded
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
}
