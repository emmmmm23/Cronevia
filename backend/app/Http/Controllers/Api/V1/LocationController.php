<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index(Request $request)
    {
        $locations = Location::query()
            ->where('user_id', $request->user()->id)
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => $locations->items(),
            'meta' => [
                'current_page' => $locations->currentPage(),
                'per_page' => $locations->perPage(),
                'total' => $locations->total(),
                'last_page' => $locations->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:255'],
            'address' => ['nullable', 'string'],
            'country_code' => ['nullable', 'string', 'size:3'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'category' => ['nullable', 'in:accommodation,restaurant,attraction,transport,activity,shopping,nature,other'],
        ]);

        $location = Location::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
            'country_code' => $validated['country_code'] ?? null,
            'city' => $validated['city'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'category' => $validated['category'] ?? null,
        ]);

        return response()->json($location, 201);
    }

    public function show(Location $location)
    {
        $this->authorize('view', $location);

        return response()->json($location);
    }

    public function update(Request $request, Location $location)
    {
        $this->authorize('update', $location);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:1', 'max:255'],
            'address' => ['nullable', 'string'],
            'country_code' => ['nullable', 'string', 'size:3'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'category' => ['nullable', 'in:accommodation,restaurant,attraction,transport,activity,shopping,nature,other'],
        ]);

        $location->fill($validated);
        $location->save();

        return response()->json($location);
    }

    public function destroy(Location $location)
    {
        $this->authorize('delete', $location);
        $location->delete();

        return response()->noContent();
    }
}
