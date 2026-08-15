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
        $memories = Memory::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('memory_date')
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
        ]);

        return (new MemoryResource($memory))->response()->setStatusCode(201);
    }

    public function show(Memory $memory)
    {
        $this->authorize('view', $memory);

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
}
