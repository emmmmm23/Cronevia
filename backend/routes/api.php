<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Auth routes (public)
    Route::prefix('auth')->group(function () {
        Route::post('register', [\App\Http\Controllers\Api\V1\AuthController::class, 'register'])
            ->middleware('throttle:30,1');
        Route::post('login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login'])
            ->middleware('throttle:5,1');
        Route::post('logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout'])
            ->middleware('auth:sanctum');
        Route::get('me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me'])
            ->middleware('auth:sanctum');
        Route::patch('profile', [\App\Http\Controllers\Api\V1\AuthController::class, 'updateProfile'])
            ->middleware('auth:sanctum');
        Route::post('profile/photo', [\App\Http\Controllers\Api\V1\AuthController::class, 'uploadProfilePhoto'])
            ->middleware('auth:sanctum');
        Route::delete('profile/photo', [\App\Http\Controllers\Api\V1\AuthController::class, 'deleteProfilePhoto'])
            ->middleware('auth:sanctum');
        Route::patch('password', [\App\Http\Controllers\Api\V1\AuthController::class, 'changePassword'])
            ->middleware('auth:sanctum');
        Route::patch('email', [\App\Http\Controllers\Api\V1\AuthController::class, 'changeEmail'])
            ->middleware('auth:sanctum');
        Route::delete('account', [\App\Http\Controllers\Api\V1\AuthController::class, 'deleteAccount'])
            ->middleware('auth:sanctum');
    });

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        // Dashboard
        Route::get('dashboard', [\App\Http\Controllers\Api\V1\DashboardController::class, 'index']);

        // Trips
        Route::apiResource('trips', \App\Http\Controllers\Api\V1\TripController::class);
        Route::post('trips/{trip}/days', [\App\Http\Controllers\Api\V1\TripDayController::class, 'store']);
        Route::get('trips/{trip}/days', [\App\Http\Controllers\Api\V1\TripDayController::class, 'index']);
        Route::apiResource('trips/{trip}/days/{day}/itinerary', \App\Http\Controllers\Api\V1\ItineraryController::class)
            ->parameters(['itinerary' => 'item']);
        Route::patch('trips/{trip}/days/{day}/itinerary/reorder', [\App\Http\Controllers\Api\V1\ItineraryController::class, 'reorder']);
        Route::post('trips/{trip}/days/{day}/itinerary/{item}/convert', [\App\Http\Controllers\Api\V1\ItineraryController::class, 'convert']);
        Route::post('trips/{trip}/media', [\App\Http\Controllers\Api\V1\MediaController::class, 'storeForTrip']);
        Route::delete('trips/{trip}/media/{media}', [\App\Http\Controllers\Api\V1\MediaController::class, 'destroyForTrip']);
        Route::patch('trips/{trip}/media/{media}/set-cover', [\App\Http\Controllers\Api\V1\MediaController::class, 'setCoverPhoto']);

        // Journal
        Route::apiResource('journal', \App\Http\Controllers\Api\V1\JournalController::class)
            ->parameters(['journal' => 'entry']);
        Route::patch('journal/{entry}/archive', [\App\Http\Controllers\Api\V1\JournalController::class, 'archive']);
        Route::patch('journal/{entry}/restore', [\App\Http\Controllers\Api\V1\JournalController::class, 'restore']);
        Route::post('journal/{entry}/media', [\App\Http\Controllers\Api\V1\MediaController::class, 'storeForJournal']);
        Route::delete('journal/{entry}/media/{media}', [\App\Http\Controllers\Api\V1\MediaController::class, 'destroyForJournal']);

        // Memories
        Route::apiResource('memories', \App\Http\Controllers\Api\V1\MemoryController::class);
        Route::post('memories/{memory}/media', [\App\Http\Controllers\Api\V1\MediaController::class, 'store']);
        Route::delete('memories/{memory}/media/{media}', [\App\Http\Controllers\Api\V1\MediaController::class, 'destroy']);
        Route::patch('memories/{memory}/archive', [\App\Http\Controllers\Api\V1\MemoryController::class, 'archive']);
        Route::patch('memories/{memory}/restore', [\App\Http\Controllers\Api\V1\MemoryController::class, 'restore']);

        // Map
        Route::get('map/pins', [\App\Http\Controllers\Api\V1\MapController::class, 'pins']);
        Route::get('map/trips/{trip}/replay', [\App\Http\Controllers\Api\V1\MapController::class, 'replay']);

        // Time Capsules
        Route::apiResource('capsules', \App\Http\Controllers\Api\V1\TimeCapsuleController::class);
        Route::post('capsules/{capsule}/items', [\App\Http\Controllers\Api\V1\TimeCapsuleController::class, 'addItems']);
        Route::apiResource('time-capsules', \App\Http\Controllers\Api\V1\TimeCapsuleController::class)
            ->parameters(['time-capsules' => 'capsule']);
        Route::post('time-capsules/{capsule}/items', [\App\Http\Controllers\Api\V1\TimeCapsuleController::class, 'addItems']);

        // Future Letters
        Route::apiResource('letters', \App\Http\Controllers\Api\V1\FutureLetterController::class)
            ->only(['index', 'store', 'show', 'destroy']);
        Route::apiResource('future-letters', \App\Http\Controllers\Api\V1\FutureLetterController::class)
            ->only(['index', 'store', 'show', 'destroy'])
            ->parameters(['future-letters' => 'letter']);

        // Timeline & On This Day
        Route::get('timeline', [\App\Http\Controllers\Api\V1\OnThisDayController::class, 'index']);
        Route::get('on-this-day', [\App\Http\Controllers\Api\V1\OnThisDayController::class, 'onThisDay']);

        // Search
        Route::get('search', [\App\Http\Controllers\Api\V1\SearchController::class, 'index']);

        // Locations
        Route::apiResource('locations', \App\Http\Controllers\Api\V1\LocationController::class);

        // Tags
        Route::apiResource('tags', \App\Http\Controllers\Api\V1\TagController::class);

        // People
        Route::apiResource('people', \App\Http\Controllers\Api\V1\PersonController::class);
    });

    // SUPER ADMIN ROUTES - Protected by EnsureSuperAdmin middleware
    // ============================================================
    // SECURITY: All routes require authentication + super_admin role
    Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(function () {
        // Dashboard
        Route::get('dashboard', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'dashboard']);

        // User Management
        Route::get('users', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'listUsers']);
        Route::get('users/{user}', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'showUser']);
        Route::post('users/{user}/suspend', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'suspendUser']);
        Route::post('users/{user}/reactivate', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'reactivateUser']);
        Route::delete('users/{user}', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'deleteUser']);

        // Database Management
        Route::get('database/status', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'databaseStatus']);

        // System Health
        Route::get('system/health', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'systemHealth']);

        // Security
        Route::get('security/status', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'securityStatus']);

        // Audit Logs
        Route::get('audit-logs', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'auditLogs']);
    });
});


