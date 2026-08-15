<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index(Request $request)
    {
        $tags = Tag::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('name')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => $tags->items(),
            'meta' => [
                'current_page' => $tags->currentPage(),
                'per_page' => $tags->perPage(),
                'total' => $tags->total(),
                'last_page' => $tags->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:50'],
            'color_hex' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $tag = Tag::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'color_hex' => $validated['color_hex'],
        ]);

        return response()->json($tag, 201);
    }

    public function show(Tag $tag)
    {
        $this->authorize('view', $tag);

        return response()->json($tag);
    }

    public function update(Request $request, Tag $tag)
    {
        $this->authorize('update', $tag);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:1', 'max:50'],
            'color_hex' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $tag->fill($validated);
        $tag->save();

        return response()->json($tag);
    }

    public function destroy(Tag $tag)
    {
        $this->authorize('delete', $tag);
        $tag->delete();

        return response()->noContent();
    }
}
