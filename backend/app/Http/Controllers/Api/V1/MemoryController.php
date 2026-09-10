<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemoryRequest;
use App\Http\Requests\UpdateMemoryRequest;
use App\Http\Resources\MemoryResource;
use App\Models\Memory;
use Illuminate\Http\Request;

class MemoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Memory::query()
            ->where('user_id', $request->user()->id)
            ->with('media'); // Load media relationship

        // Filter by archive status (default: show only non-archived)
        if ($request->query('archived') === 'true') {
            $query->where('is_archived', true);
        } elseif ($request->query('archived') === 'all') {
            // Show all memories regardless of archive status
        } else {
            // Default: only non-archived
            $query->where('is_archived', false);
        }

        $memories = $query
            ->orderByDesc('memory_date')
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => MemoryResource::collection($memories->items()),
            'meta' => [
                'current_page' => $memories->currentPage(),
                'per_page' => $memories->perPage(),
                'total' => $memories->total(),
                'last_page' => $memories->lastPage(),
            ],
        ]);
    }

    public function store(StoreMemoryRequest $request)
    {
        $validated = $request->validated();

        $memory = Memory::create([
            'user_id' => $request->user()->id,
            'trip_id' => $validated['trip_id'] ?? null,
            'itinerary_item_id' => $validated['itinerary_item_id'] ?? null,
            'journal_entry_id' => $validated['journal_entry_id'] ?? null,
            'location_id' => $validated['location_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'memory_date' => $validated['memory_date'],
            'visibility' => $validated['visibility'] ?? 'private',
            'is_archived' => false,
        ]);

        return response()->json([
            'message' => 'Memory created successfully.',
            'data' => new MemoryResource($memory),
        ], 201);
    }

    public function show(Memory $memory)
    {
        $this->authorize('view', $memory);
        
        $memory->load('media');

        return new MemoryResource($memory);
    }

    public function update(UpdateMemoryRequest $request, Memory $memory)
    {
        $this->authorize('update', $memory);

        $validated = $request->validated();

        $memory->fill($validated);
        $memory->save();

        return new MemoryResource($memory);
    }

    public function destroy(Memory $memory)
    {
        $this->authorize('delete', $memory);
        $memory->delete();

        return response()->noContent();
    }

    /**
     * PATCH /api/v1/memories/{memory}/archive
     * 
     * Archives a memory without deleting it.
     */
    public function archive(Memory $memory)
    {
        $this->authorize('update', $memory);
        
        $memory->is_archived = true;
        $memory->save();

        return response()->json([
            'message' => 'Memory archived successfully.',
            'data' => new MemoryResource($memory),
        ]);
    }

    /**
     * PATCH /api/v1/memories/{memory}/restore
     * 
     * Restores an archived memory to active status.
     */
    public function restore(Memory $memory)
    {
        $this->authorize('update', $memory);
        
        $memory->is_archived = false;
        $memory->save();

        return response()->json([
            'message' => 'Memory restored successfully.',
            'data' => new MemoryResource($memory),
        ]);
    }
}
