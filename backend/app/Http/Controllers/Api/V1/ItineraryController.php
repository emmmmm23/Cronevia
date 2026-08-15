<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreItineraryItemRequest;
use App\Http\Resources\ItineraryItemResource;
use App\Models\ItineraryItem;
use App\Models\Trip;
use App\Models\TripDay;
use App\Services\MemoryService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ItineraryController extends Controller
{
    public function index(Trip $trip, TripDay $day)
    {
        $this->authorize('view', $trip);

        return response()->json(
            ItineraryItemResource::collection($day->itineraryItems()->orderBy('sort_order')->get())
        );
    }

    public function store(StoreItineraryItemRequest $request, Trip $trip, TripDay $day)
    {
        $this->authorize('addDay', $trip);

        $validated = $request->validated();

        $nextOrder = $day->itineraryItems()->max('sort_order') ?? 0;

        $item = ItineraryItem::create([
            'trip_day_id' => $day->id,
            'location_id' => $validated['location_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'scheduled_time' => $validated['scheduled_time'] ?? null,
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'duration_minutes' => $validated['duration_minutes'] ?? null,
            'travel_time_minutes' => $validated['travel_time_minutes'] ?? null,
            'estimated_cost' => $validated['estimated_cost'] ?? null,
            'currency' => $validated['currency'] ?? null,
            'category' => $validated['category'] ?? null,
            'status' => $validated['status'] ?? 'planned',
            'notes' => $validated['notes'] ?? null,
            'sort_order' => $nextOrder + 1,
            'converted_to_memory' => false,
        ]);

        return (new ItineraryItemResource($item))->response()->setStatusCode(201);
    }

    public function update(Request $request, Trip $trip, TripDay $day, ItineraryItem $item)
    {
        $this->authorize('view', $trip);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location_id' => ['nullable', 'uuid'],
            'scheduled_time' => ['nullable', 'date_format:H:i:s'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:planned,visited,skipped'],
        ]);

        $item->fill($validated);
        $item->save();

        return new ItineraryItemResource($item);
    }

    public function destroy(Trip $trip, TripDay $day, ItineraryItem $item)
    {
        $this->authorize('view', $trip);
        $item->delete();

        return response()->noContent();
    }

    public function reorder(Request $request, Trip $trip, TripDay $day)
    {
        $this->authorize('view', $trip);

        $orderedIds = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['required', 'uuid'],
        ])['order'];

        foreach ($orderedIds as $index => $id) {
            $item = $day->itineraryItems()->whereKey($id)->firstOrFail();
            $item->sort_order = $index + 1;
            $item->save();
        }

        return response()->json(ItineraryItemResource::collection($day->itineraryItems()->orderBy('sort_order')->get()));
    }

    public function convert(Request $request, Trip $trip, TripDay $day, ItineraryItem $item, MemoryService $memoryService)
    {
        $this->authorize('view', $trip);

        if ($item->trip_day_id !== $day->id) {
            abort(404);
        }

        $validated = $request->validate([
            'journal_content' => ['nullable', 'string', 'max:10000'],
            'mood' => ['nullable', 'in:happy,excited,peaceful,nostalgic,sad,anxious,neutral'],
        ]);

        try {
            $memory = $memoryService->convertItineraryItemToMemory($item, $trip, $day, $validated);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json($memory, 201);
    }
}
