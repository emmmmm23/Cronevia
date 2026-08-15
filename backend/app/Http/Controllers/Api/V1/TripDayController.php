<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripDay;
use Illuminate\Http\Request;

class TripDayController extends Controller
{
    public function index(Trip $trip)
    {
        $this->authorize('view', $trip);

        return response()->json($trip->tripDays()->orderBy('date')->get());
    }

    public function store(Request $request, Trip $trip)
    {
        $this->authorize('addDay', $trip);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $maxDayNumber = $trip->tripDays()->max('day_number') ?? 0;

        $day = TripDay::create([
            'trip_id' => $trip->id,
            'date' => $validated['date'],
            'day_number' => $maxDayNumber + 1,
            'title' => $validated['title'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($day, 201);
    }
}
