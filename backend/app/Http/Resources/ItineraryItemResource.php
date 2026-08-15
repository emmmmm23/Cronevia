<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItineraryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'trip_day_id' => $this->trip_day_id,
            'location_id' => $this->location_id,
            'title' => $this->title,
            'description' => $this->description,
            'scheduled_time' => $this->scheduled_time,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'duration_minutes' => $this->duration_minutes,
            'travel_time_minutes' => $this->travel_time_minutes,
            'estimated_cost' => $this->estimated_cost,
            'currency' => $this->currency,
            'category' => $this->category,
            'status' => $this->status,
            'notes' => $this->notes,
            'sort_order' => $this->sort_order,
            'converted_to_memory' => (bool) $this->converted_to_memory,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
