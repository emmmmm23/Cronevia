<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFutureLetterRequest;
use App\Http\Resources\FutureLetterResource;
use App\Models\FutureLetter;
use Illuminate\Http\Request;

class FutureLetterController extends Controller
{
    public function index(Request $request)
    {
        $letters = FutureLetter::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('deliver_at')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return response()->json([
            'data' => FutureLetterResource::collection($letters->items()),
            'meta' => [
                'current_page' => $letters->currentPage(),
                'per_page' => $letters->perPage(),
                'total' => $letters->total(),
                'last_page' => $letters->lastPage(),
            ],
        ]);
    }

    public function store(StoreFutureLetterRequest $request)
    {
        $validated = $request->validated();

        $letter = FutureLetter::create([
            'user_id' => $request->user()->id,
            'recipient_email' => $validated['recipient_email'],
            'subject' => $validated['subject'],
            'content' => $validated['content'],
            'deliver_at' => $validated['deliver_at'],
            'status' => 'locked',
            'is_delivered' => false,
        ]);

        return (new FutureLetterResource($letter))->response()->setStatusCode(201);
    }

    public function show(Request $request, FutureLetter $letter)
    {
        $this->authorize('view', $letter);

        return new FutureLetterResource($letter);
    }

    public function destroy(FutureLetter $letter)
    {
        $this->authorize('delete', $letter);

        if ($letter->is_delivered) {
            return response()->json([
                'message' => 'Delivered letters cannot be deleted.',
            ], 422);
        }

        $letter->delete();

        return response()->noContent();
    }
}
