<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FutureLetterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isUnlocked = $this->deliver_at <= now() || $this->status === 'unlocked';

        $data = [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'recipient_email' => $this->recipient_email,
            'subject' => $this->subject,
            'deliver_at' => $this->deliver_at,
            'status' => $this->status,
            'is_delivered' => (bool) $this->is_delivered,
            'delivered_at' => $this->delivered_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        if ($isUnlocked) {
            $data['content'] = $this->content;
        }

        return $data;
    }
}
