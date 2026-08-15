<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreItineraryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location_id' => ['nullable', 'uuid'],
            'scheduled_time' => ['nullable', 'date_format:H:i:s'],
            'start_time' => ['nullable', 'date_format:H:i:s'],
            'end_time' => ['nullable', 'date_format:H:i:s'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'travel_time_minutes' => ['nullable', 'integer', 'min:0'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'category' => ['nullable', 'string'],
            'status' => ['nullable', 'in:planned,visited,skipped'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
