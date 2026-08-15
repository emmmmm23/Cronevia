<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMemoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:1', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'memory_date' => ['sometimes', 'date'],
            'trip_id' => ['sometimes', 'nullable', 'uuid'],
            'itinerary_item_id' => ['sometimes', 'nullable', 'uuid'],
            'journal_entry_id' => ['sometimes', 'nullable', 'uuid'],
            'location_id' => ['sometimes', 'nullable', 'uuid'],
            'visibility' => ['sometimes', 'in:private,public,friends'],
        ];
    }
}
