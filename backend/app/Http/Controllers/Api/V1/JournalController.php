<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJournalEntryRequest;
use App\Http\Requests\UpdateJournalEntryRequest;
use App\Http\Resources\JournalEntryResource;
use App\Models\JournalEntry;
use Illuminate\Http\Request;

class JournalController extends Controller
{
    /**
     * GET /api/v1/journal
     *
     * Returns ONLY the authenticated user's entries.
     * Supports filters: trip_id, trip_day_id, mood, entry_date_from, entry_date_to.
     */
    public function index(Request $request)
    {
        $query = JournalEntry::query()
            ->where('user_id', $request->user()->id)
            ->with('media') // Load media relationship
            ->when($request->filled('trip_id'),        fn ($q) => $q->where('trip_id', $request->trip_id))
            ->when($request->filled('trip_day_id'),    fn ($q) => $q->where('trip_day_id', $request->trip_day_id))
            ->when($request->filled('mood'),           fn ($q) => $q->where('mood', $request->mood))
            ->when($request->filled('entry_date_from'), fn ($q) => $q->whereDate('entry_date', '>=', $request->entry_date_from))
            ->when($request->filled('entry_date_to'),   fn ($q) => $q->whereDate('entry_date', '<=', $request->entry_date_to));

        // Filter by archive status (default: show only non-archived)
        if ($request->query('archived') === 'true') {
            $query->where('is_archived', true);
        } elseif ($request->query('archived') === 'all') {
            // Show all entries regardless of archive status
        } else {
            // Default: only non-archived
            $query->where('is_archived', false);
        }

        $entries = $query
            ->orderByDesc('entry_date')
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => JournalEntryResource::collection($entries->items()),
            'meta' => [
                'current_page' => $entries->currentPage(),
                'per_page'     => $entries->perPage(),
                'total'        => $entries->total(),
                'last_page'    => $entries->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/journal
     *
     * Creates a new journal entry belonging to the authenticated user.
     * user_id is ALWAYS set server-side — never trusted from the request.
     * created_at / updated_at are set automatically by Eloquent.
     */
    public function store(StoreJournalEntryRequest $request)
    {
        $validated = $request->validated();

        $entry = JournalEntry::create([
            'user_id'           => $request->user()->id,  // always from session
            'trip_id'           => $validated['trip_id'] ?? null,
            'location_id'       => $validated['location_id'] ?? null,
            'trip_day_id'       => $validated['trip_day_id'] ?? null,
            'itinerary_item_id' => $validated['itinerary_item_id'] ?? null,

            'title'      => $validated['title'],
            'content'    => $validated['content'],
            'entry_date' => $validated['entry_date'],

            'mood'       => $validated['mood'] ?? null,
            'mood_emoji' => $validated['mood_emoji'] ?? null,
            'mood_label' => $validated['mood_label'] ?? null,

            'location_name'   => $validated['location_name'] ?? null,
            'latitude'        => $validated['latitude'] ?? null,
            'longitude'       => $validated['longitude'] ?? null,
            'location_source' => $validated['location_source'] ?? null,

            'weather'    => $validated['weather'] ?? null,
            'visibility' => $validated['visibility'] ?? 'private',
        ]);

        return response()->json([
            'message' => 'Journal entry saved successfully.',
            'data'    => new JournalEntryResource($entry),
        ], 201);
    }

    /**
     * GET /api/v1/journal/{entry}
     */
    public function show(JournalEntry $entry)
    {
        $this->authorize('view', $entry);
        
        $entry->load('media');

        return new JournalEntryResource($entry);
    }

    /**
     * PUT|PATCH /api/v1/journal/{entry}
     *
     * created_at is preserved automatically.
     * updated_at is touched by Eloquent on every save.
     */
    public function update(UpdateJournalEntryRequest $request, JournalEntry $entry)
    {
        $this->authorize('update', $entry);

        $entry->fill($request->validated());
        $entry->save();

        return response()->json([
            'message' => 'Journal entry updated.',
            'data'    => new JournalEntryResource($entry),
        ]);
    }

    /**
     * DELETE /api/v1/journal/{entry}
     */
    public function destroy(JournalEntry $entry)
    {
        $this->authorize('delete', $entry);
        $entry->delete();

        return response()->noContent();
    }

    /**
     * PATCH /api/v1/journal/{entry}/archive
     * 
     * Archives a journal entry without deleting it.
     * Archived entries are hidden from default listings but remain accessible.
     */
    public function archive(JournalEntry $entry)
    {
        $this->authorize('update', $entry);
        
        $entry->is_archived = true;
        $entry->save();

        return response()->json([
            'message' => 'Journal entry archived successfully.',
            'data'    => new JournalEntryResource($entry),
        ]);
    }

    /**
     * PATCH /api/v1/journal/{entry}/restore
     * 
     * Restores an archived journal entry to active status.
     */
    public function restore(JournalEntry $entry)
    {
        $this->authorize('update', $entry);
        
        $entry->is_archived = false;
        $entry->save();

        return response()->json([
            'message' => 'Journal entry restored successfully.',
            'data'    => new JournalEntryResource($entry),
        ]);
    }
}
