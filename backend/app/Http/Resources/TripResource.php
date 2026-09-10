<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'destination' => $this->destination,
            'slug' => $this->slug,
            'description' => $this->description,
            'cover_image_path' => $this->cover_image_path,
            'cover_media_id' => $this->cover_media_id,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'budget' => $this->budget,
            'currency' => $this->currency,
            'status' => $this->status,
            'visibility' => $this->visibility,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'media' => MediaResource::collection($this->whenLoaded('media')),
        ];
    }
}
