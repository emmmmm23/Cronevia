<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Models\Location;
use App\Models\Memory;
use App\Models\Tag;
use App\Models\Trip;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['required', 'string'],
            'type' => ['nullable', 'in:trips,journal_entries,memories,locations,tags'],
        ]);

        $query = trim($validated['q']);
        if ($query === '') {
            return response()->json([
                'message' => 'Search query is required.',
                'errors' => ['q' => ['Search query is required.']],
            ], 422);
        }

        $userId = $request->user()->id;
        $type = $validated['type'] ?? null;

        $result = [
            'trips' => [],
            'journal_entries' => [],
            'memories' => [],
            'locations' => [],
            'tags' => [],
        ];

        if (! $type || $type === 'trips') {
            $result['trips'] = Trip::query()
                ->where('user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('title', 'like', '%'.$query.'%')
                        ->orWhere('description', 'like', '%'.$query.'%')
                        ->orWhere('destination', 'like', '%'.$query.'%');
                })
                ->limit(50)
                ->get();
        }

        if (! $type || $type === 'journal_entries') {
            $result['journal_entries'] = JournalEntry::query()
                ->where('user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('title', 'like', '%'.$query.'%')
                        ->orWhere('content', 'like', '%'.$query.'%');
                })
                ->limit(50)
                ->get();
        }

        if (! $type || $type === 'memories') {
            $result['memories'] = Memory::query()
                ->where('user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('title', 'like', '%'.$query.'%')
                        ->orWhere('description', 'like', '%'.$query.'%');
                })
                ->limit(50)
                ->get();
        }

        if (! $type || $type === 'locations') {
            $result['locations'] = Location::query()
                ->where('user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('name', 'like', '%'.$query.'%')
                        ->orWhere('address', 'like', '%'.$query.'%')
                        ->orWhere('city', 'like', '%'.$query.'%')
                        ->orWhere('province', 'like', '%'.$query.'%')
                        ->orWhere('country', 'like', '%'.$query.'%');
                })
                ->limit(50)
                ->get();
        }

        if (! $type || $type === 'tags') {
            $result['tags'] = Tag::query()
                ->where('user_id', $userId)
                ->where('name', 'like', '%'.$query.'%')
                ->limit(50)
                ->get();
        }

        return response()->json(['data' => $result]);
    }
}
