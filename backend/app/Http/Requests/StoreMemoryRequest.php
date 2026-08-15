<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:1', 'max:255'],
            'description' => ['nullable', 'string'],
            'memory_date' => ['required', 'date'],
            'trip_id' => ['nullable', 'uuid'],
            'itinerary_item_id' => ['nullable', 'uuid'],
            'journal_entry_id' => ['nullable', 'uuid'],
            'location_id' => ['nullable', 'uuid'],
            'visibility' => ['nullable', 'in:private,public,friends'],
        ];
    }
}
