<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimeCapsuleRequest extends FormRequest
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
            'unlock_at' => ['required', 'date', 'after:now'],
            'visibility' => ['nullable', 'in:private,public,friends'],
        ];
    }
}
