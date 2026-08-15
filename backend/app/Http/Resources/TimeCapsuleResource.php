<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimeCapsuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locked = ! $this->is_unlocked && $this->status !== 'unlocked';

        $data = [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'description' => $this->description,
            'unlock_at' => $this->unlock_at,
            'status' => $this->status,
            'is_unlocked' => (bool) $this->is_unlocked,
            'unlocked_at' => $this->unlocked_at,
            'visibility' => $this->visibility,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        if (! $locked) {
            $data['items'] = $this->whenLoaded('items');
        }

        return $data;
    }
}
