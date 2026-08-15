<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTimeCapsuleRequest;
use App\Http\Resources\TimeCapsuleResource;
use App\Models\JournalEntry;
use App\Models\Media;
use App\Models\Memory;
use App\Models\TimeCapsule;
use App\Models\TimeCapsuleItem;
use Illuminate\Http\Request;

class TimeCapsuleController extends Controller
{
    public function index(Request $request)
    {
        $capsules = TimeCapsule::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('unlock_at')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => TimeCapsuleResource::collection($capsules->items()),
            'meta' => [
                'current_page' => $capsules->currentPage(),
                'per_page' => $capsules->perPage(),
                'total' => $capsules->total(),
                'last_page' => $capsules->lastPage(),
            ],
        ]);
    }

    public function store(StoreTimeCapsuleRequest $request)
    {
        $validated = $request->validated();

        $capsule = TimeCapsule::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'unlock_at' => $validated['unlock_at'],
            'status' => 'locked',
            'is_unlocked' => false,
            'visibility' => $validated['visibility'] ?? 'private',
        ]);

        return (new TimeCapsuleResource($capsule))->response()->setStatusCode(201);
    }

    public function show(Request $request, TimeCapsule $capsule)
    {
        $this->authorize('view', $capsule);

        if (! $capsule->is_unlocked) {
            return new TimeCapsuleResource($capsule);
        }

        $capsule->load('items');

        return new TimeCapsuleResource($capsule);
    }

    public function update(Request $request, TimeCapsule $capsule)
    {
        $this->authorize('update', $capsule);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'unlock_at' => ['sometimes', 'date', 'after:now'],
            'visibility' => ['sometimes', 'in:private,public,friends'],
        ]);

        $capsule->fill($validated);
        $capsule->save();

        return new TimeCapsuleResource($capsule);
    }

    public function destroy(TimeCapsule $capsule)
    {
        $this->authorize('delete', $capsule);
        $capsule->delete();

        return response()->noContent();
    }

    public function addItems(Request $request, TimeCapsule $capsule)
    {
        $this->authorize('update', $capsule);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'in:memory,journal_entry,media'],
            'items.*.item_id' => ['required', 'uuid'],
        ]);

        foreach ($validated['items'] as $index => $payload) {
            $itemModel = match ($payload['item_type']) {
                'memory' => Memory::query()->where('user_id', $request->user()->id)->whereKey($payload['item_id'])->first(),
                'journal_entry' => JournalEntry::query()->where('user_id', $request->user()->id)->whereKey($payload['item_id'])->first(),
                default => Media::query()->where('user_id', $request->user()->id)->whereKey($payload['item_id'])->first(),
            };

            if (! $itemModel) {
                return response()->json([
                    'message' => 'One or more items are invalid or unauthorized.',
                ], 422);
            }

            TimeCapsuleItem::create([
                'capsule_id' => $capsule->id,
                'item_type' => $itemModel::class,
                'item_id' => $itemModel->id,
                'sort_order' => $index,
            ]);
        }

        return (new TimeCapsuleResource($capsule->load('items')))->response()->setStatusCode(201);
    }
}
