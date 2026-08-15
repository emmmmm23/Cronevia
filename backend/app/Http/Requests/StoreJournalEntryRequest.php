<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Core fields
            'title'      => ['required', 'string', 'min:1', 'max:255'],
            'content'    => ['required', 'string', 'min:1', 'max:10000'],
            'entry_date' => ['required', 'date'],

            // Mood — legacy enum OR free-text label + emoji
            'mood'       => ['nullable', 'string', 'max:100'],
            'mood_emoji' => ['nullable', 'string', 'max:32'],
            'mood_label' => ['nullable', 'string', 'max:100'],

            // Location (all optional — user must explicitly add)
            'location_name'   => ['nullable', 'string', 'max:255'],
            'latitude'        => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'       => ['nullable', 'numeric', 'between:-180,180'],
            'location_source' => ['nullable', 'in:geolocation,search,manual'],
            'location_id'     => ['nullable', 'uuid'],

            // Optional linkage
            'weather'           => ['nullable', 'string', 'max:60'],
            'trip_id'           => ['nullable', 'uuid'],
            'trip_day_id'       => ['nullable', 'uuid'],
            'itinerary_item_id' => ['nullable', 'uuid'],
            'visibility'        => ['nullable', 'in:private,public,friends'],
        ];
    }
}
