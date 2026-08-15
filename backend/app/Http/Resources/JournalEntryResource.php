<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'user_id'            => $this->user_id,
            'trip_id'            => $this->trip_id,
            'location_id'        => $this->location_id,
            'trip_day_id'        => $this->trip_day_id,
            'itinerary_item_id'  => $this->itinerary_item_id,
            'memory_id'          => $this->memory_id,

            // Content
            'title'              => $this->title,
            'content'            => $this->content,

            // Mood — emoji + label stored separately from legacy enum
            'mood'               => $this->mood,
            'mood_emoji'         => $this->mood_emoji,
            'mood_label'         => $this->mood_label,

            // Location
            'location_name'      => $this->location_name,
            'latitude'           => $this->latitude,
            'longitude'          => $this->longitude,
            'location_source'    => $this->location_source,

            // Other
            'weather'            => $this->weather,
            'visibility'         => $this->visibility,
            'entry_date'         => $this->entry_date?->toDateString(),

            // Timestamps — backend is authoritative
            'created_at'         => $this->created_at?->toIso8601String(),
            'updated_at'         => $this->updated_at?->toIso8601String(),
        ];
    }
}
