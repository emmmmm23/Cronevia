<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateJournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'      => ['sometimes', 'string', 'min:1', 'max:255'],
            'content'    => ['sometimes', 'string', 'min:1', 'max:10000'],
            'entry_date' => ['sometimes', 'date'],

            'mood'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'mood_emoji' => ['sometimes', 'nullable', 'string', 'max:32'],
            'mood_label' => ['sometimes', 'nullable', 'string', 'max:100'],

            'location_name'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'latitude'        => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude'       => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'location_source' => ['sometimes', 'nullable', 'in:geolocation,search,manual'],
            'location_id'     => ['sometimes', 'nullable', 'uuid'],

            'weather'           => ['sometimes', 'nullable', 'string', 'max:60'],
            'trip_id'           => ['sometimes', 'nullable', 'uuid'],
            'trip_day_id'       => ['sometimes', 'nullable', 'uuid'],
            'itinerary_item_id' => ['sometimes', 'nullable', 'uuid'],
            'visibility'        => ['sometimes', 'in:private,public,friends'],
        ];
    }
}
