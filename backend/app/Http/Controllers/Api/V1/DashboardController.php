<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * GET /api/v1/dashboard
     *
     * Returns dashboard data for the authenticated user.
     * All data is user-isolated via authenticated user context.
     *
     * Preconditions:
     *   - User must be authenticated (enforced by middleware)
     *
     * Postconditions:
     *   - Returns JSON with journal_count, trip_count, memory_count, place_count
     *   - Returns recent_journals, recent_trips, on_this_day arrays
     *   - All counts and records belong ONLY to authenticated user
     *   - No other user's data is ever included
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get counts from database
        $journalCount = $user->journalEntries()->count();
        $tripCount = $user->trips()->count();
        $memoryCount = $user->memories()->count();
        $placeCount = $user->locations()->count();

        // Get recent journals (latest 5)
        $recentJournals = $user->journalEntries()
            ->latest('entry_date')
            ->limit(5)
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'title' => $entry->title,
                'entry_date' => $entry->entry_date,
                'mood' => $entry->mood,
                'trip_id' => $entry->trip_id,
            ]);

        // Get recent trips (latest 5)
        $recentTrips = $user->trips()
            ->latest('start_date')
            ->limit(5)
            ->get()
            ->map(fn ($trip) => [
                'id' => $trip->id,
                'title' => $trip->title,
                'start_date' => $trip->start_date,
                'end_date' => $trip->end_date,
                'status' => $trip->status,
            ]);

        // Get "On This Day" (memories/entries from today's date in past years)
        $today = now();
        $onThisDay = $user->memories()
            ->whereRaw('MONTH(memory_date) = ?', [$today->month])
            ->whereRaw('DAY(memory_date) = ?', [$today->day])
            ->where('memory_date', '<', $today->startOfDay()) // only past years
            ->orderBy('memory_date', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($memory) => [
                'id' => $memory->id,
                'title' => $memory->title,
                'memory_date' => $memory->memory_date,
                'type' => 'memory',
            ]);

        return response()->json([
            'journal_count' => $journalCount,
            'trip_count' => $tripCount,
            'memory_count' => $memoryCount,
            'place_count' => $placeCount,
            'recent_journals' => $recentJournals,
            'recent_trips' => $recentTrips,
            'on_this_day' => $onThisDay,
        ]);
    }
}

