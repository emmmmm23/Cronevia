<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\V1\JournalController;
use App\Http\Controllers\Api\V1\MemoryController;
use App\Http\Controllers\Api\V1\TripController;
use App\Models\JournalEntry;
use App\Models\Memory;
use App\Models\Trip;
use App\Http\Resources\JournalEntryResource;
use App\Http\Resources\MemoryResource;
use App\Http\Resources\TripResource;
use Illuminate\Http\Request;

class OnThisDayController extends Controller
{
    /**
     * Get the full timeline (all journals, trips, memories) for the authenticated user.
     * Returns combined chronological data for timeline view.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Fetch all non-archived journal entries with media
        $journals = JournalEntry::query()
            ->where('user_id', $user->id)
            ->where('is_archived', false)
            ->with('media')
            ->orderBy('entry_date', 'desc')
            ->get();

        // Fetch all trips with media
        $trips = Trip::query()
            ->where('user_id', $user->id)
            ->with('media')
            ->orderBy('start_date', 'desc')
            ->get();

        // Fetch all non-archived memories with media
        $memories = Memory::query()
            ->where('user_id', $user->id)
            ->where('is_archived', false)
            ->with('media')
            ->orderBy('memory_date', 'desc')
            ->get();

        return response()->json([
            'data' => [
                'journals' => JournalEntryResource::collection($journals),
                'trips' => TripResource::collection($trips),
                'memories' => MemoryResource::collection($memories),
            ],
        ]);
    }

    /**
     * Get "On This Day" - items from the same month/day in previous years.
     */
    public function onThisDay(Request $request)
    {
        $todayMonth = now()->month;
        $todayDay = now()->day;
        $userId = $request->user()->id;

        $memories = Memory::query()
            ->where('user_id', $userId)
            ->where('is_archived', false)
            ->whereMonth('memory_date', $todayMonth)
            ->whereDay('memory_date', $todayDay)
            ->with('media')
            ->get();

        $journals = JournalEntry::query()
            ->where('user_id', $userId)
            ->where('is_archived', false)
            ->whereMonth('entry_date', $todayMonth)
            ->whereDay('entry_date', $todayDay)
            ->with('media')
            ->get();

        $trips = Trip::query()
            ->where('user_id', $userId)
            ->whereMonth('start_date', $todayMonth)
            ->whereDay('start_date', $todayDay)
            ->with('media')
            ->get();

        return response()->json([
            'data' => [
                'memories' => MemoryResource::collection($memories),
                'journal_entries' => JournalEntryResource::collection($journals),
                'trips' => TripResource::collection($trips),
            ],
        ]);
    }
}
