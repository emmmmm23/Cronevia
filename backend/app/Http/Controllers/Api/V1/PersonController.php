<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Person;
use Illuminate\Http\Request;

class PersonController extends Controller
{
    public function index(Request $request)
    {
        $people = Person::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('name')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => $people->items(),
            'meta' => [
                'current_page' => $people->currentPage(),
                'per_page' => $people->perPage(),
                'total' => $people->total(),
                'last_page' => $people->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:100'],
            'avatar_path' => ['nullable', 'string'],
        ]);

        $person = Person::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'avatar_path' => $validated['avatar_path'] ?? null,
        ]);

        return response()->json($person, 201);
    }

    public function show(Person $person)
    {
        $this->authorize('view', $person);

        return response()->json($person);
    }

    public function update(Request $request, Person $person)
    {
        $this->authorize('update', $person);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:1', 'max:100'],
            'avatar_path' => ['nullable', 'string'],
        ]);

        $person->fill($validated);
        $person->save();

        return response()->json($person);
    }

    public function destroy(Person $person)
    {
        $this->authorize('delete', $person);
        $person->delete();

        return response()->noContent();
    }
}
