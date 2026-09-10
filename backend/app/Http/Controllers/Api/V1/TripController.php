<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTripRequest;
use App\Http\Requests\UpdateTripRequest;
use App\Http\Resources\TripResource;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TripController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 15), 100);

        $trips = Trip::query()
            ->where('user_id', $request->user()->id)
            ->with('media') // Load media relationship
            ->orderBy('start_date', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => TripResource::collection($trips->items()),
            'meta' => [
                'current_page' => $trips->currentPage(),
                'per_page' => $trips->perPage(),
                'total' => $trips->total(),
                'last_page' => $trips->lastPage(),
            ],
        ]);
    }

    public function store(StoreTripRequest $request)
    {
        $validated = $request->validated();

        $slug = $this->generateUniqueSlug($validated['title'], $request->user()->id);

        $trip = Trip::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'destination' => $validated['destination'] ?? null,
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'budget' => $validated['budget'] ?? null,
            'currency' => $validated['currency'] ?? null,
            'status' => $validated['status'] ?? 'planning',
            'visibility' => $validated['visibility'] ?? 'private',
            'country_codes' => null,
            'metadata' => null,
        ]);

        return (new TripResource($trip))->response()->setStatusCode(201);
    }

    public function show(Trip $trip)
    {
        $this->authorize('view', $trip);
        
        $trip->load('media');

        return new TripResource($trip);
    }

    public function update(UpdateTripRequest $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        $validated = $request->validated();

        if (isset($validated['title'])) {
            $validated['slug'] = $this->generateUniqueSlug($validated['title'], $trip->user_id, $trip->id);
        }

        $trip->fill($validated);
        $trip->save();

        return new TripResource($trip);
    }

    public function destroy(Trip $trip)
    {
        $this->authorize('delete', $trip);
        $trip->delete();

        return response()->noContent();
    }

    protected function generateUniqueSlug(string $title, string $userId, ?string $ignoreTripId = null): string
    {
        $base = Str::slug($title) ?: 'trip';
        $slug = $base;
        $count = 1;

        while (Trip::query()
            ->where('user_id', $userId)
            ->when($ignoreTripId, fn ($query) => $query->whereKeyNot($ignoreTripId))
            ->where('slug', $slug)
            ->exists()) {
            $slug = $base.'-'.$count;
            $count++;
        }

        return $slug;
    }
}
