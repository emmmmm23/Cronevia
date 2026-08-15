<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'trip_id' => $this->trip_id,
            'itinerary_item_id' => $this->itinerary_item_id,
            'journal_entry_id' => $this->journal_entry_id,
            'location_id' => $this->location_id,
            'title' => $this->title,
            'description' => $this->description,
            'memory_date' => $this->memory_date,
            'visibility' => $this->visibility,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
