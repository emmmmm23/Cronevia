<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Trip;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function pins(Request $request)
    {
        $locations = Location::query()
            ->where('user_id', $request->user()->id)
            ->select(['id', 'name', 'latitude', 'longitude'])
            ->get();

        return response()->json(['data' => $locations]);
    }

    public function replay(Request $request, Trip $trip)
    {
        $this->authorize('view', $trip);

        $days = $trip->tripDays()
            ->with(['itineraryItems.location'])
            ->orderBy('date')
            ->get();

        $coords = [];
        foreach ($days as $day) {
            foreach ($day->itineraryItems as $item) {
                if ($item->location) {
                    $coords[] = [(float) $item->location->longitude, (float) $item->location->latitude];
                }
            }
        }

        if (count($coords) === 0) {
            return response()->json(['message' => 'No location data found for this trip.'], 404);
        }

        $payload = [
            'trip_id' => $trip->id,
            'days' => $days,
        ];

        if (count($coords) >= 2) {
            $payload['route_geojson'] = [
                'type' => 'FeatureCollection',
                'features' => [[
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => $coords,
                    ],
                    'properties' => [
                        'trip_id' => $trip->id,
                    ],
                ]],
            ];
        } else {
            $payload['insufficient_locations'] = true;
        }

        return response()->json(['data' => $payload]);
    }
}
