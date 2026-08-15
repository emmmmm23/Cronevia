<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Auth routes (public)
    Route::prefix('auth')->group(function () {
        Route::post('register', [\App\Http\Controllers\Api\V1\AuthController::class, 'register'])
            ->middleware('throttle:5,1');
        Route::post('login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login'])
            ->middleware('throttle:5,1');
        Route::post('logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout'])
            ->middleware('auth:sanctum');
        Route::get('me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me'])
            ->middleware('auth:sanctum');
    });

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        // Trips
        Route::apiResource('trips', \App\Http\Controllers\Api\V1\TripController::class);
        Route::post('trips/{trip}/days', [\App\Http\Controllers\Api\V1\TripDayController::class, 'store']);
        Route::get('trips/{trip}/days', [\App\Http\Controllers\Api\V1\TripDayController::class, 'index']);
        Route::apiResource('trips/{trip}/days/{day}/itinerary', \App\Http\Controllers\Api\V1\ItineraryController::class)
            ->parameters(['itinerary' => 'item']);
        Route::patch('trips/{trip}/days/{day}/itinerary/reorder', [\App\Http\Controllers\Api\V1\ItineraryController::class, 'reorder']);
        Route::post('trips/{trip}/days/{day}/itinerary/{item}/convert', [\App\Http\Controllers\Api\V1\ItineraryController::class, 'convert']);

        // Journal
        Route::apiResource('journal', \App\Http\Controllers\Api\V1\JournalController::class)
            ->parameters(['journal' => 'entry']);

        // Memories
        Route::apiResource('memories', \App\Http\Controllers\Api\V1\MemoryController::class);
        Route::post('memories/{memory}/media', [\App\Http\Controllers\Api\V1\MediaController::class, 'store']);
        Route::delete('memories/{memory}/media/{media}', [\App\Http\Controllers\Api\V1\MediaController::class, 'destroy']);

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

        // On This Day
        Route::get('on-this-day', [\App\Http\Controllers\Api\V1\OnThisDayController::class, 'index']);

        // Search
        Route::get('search', [\App\Http\Controllers\Api\V1\SearchController::class, 'index']);

        // Locations
        Route::apiResource('locations', \App\Http\Controllers\Api\V1\LocationController::class);

        // Tags
        Route::apiResource('tags', \App\Http\Controllers\Api\V1\TagController::class);

        // People
        Route::apiResource('people', \App\Http\Controllers\Api\V1\PersonController::class);
    });
});
