<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'memory_id' => $this->memory_id,
            'journal_entry_id' => $this->journal_entry_id,
            'disk' => $this->disk,
            'path' => $this->path ?: $this->file_path,
            'original_name' => $this->original_name ?: $this->original_filename,
            'mime_type' => $this->mime_type,
            'media_type' => $this->media_type ?: $this->type,
            'size' => $this->size ?: $this->file_size,
            'width' => $this->width,
            'height' => $this->height,
            'duration' => $this->duration,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
