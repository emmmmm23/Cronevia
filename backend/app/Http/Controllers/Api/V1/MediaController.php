<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaResource;
use App\Models\Media;
use App\Models\Memory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    public function store(Request $request, Memory $memory)
    {
        $this->authorize('update', $memory);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:102400'],
        ]);

        $file = $validated['file'];
        $finfoMime = mime_content_type($file->getRealPath()) ?: $file->getMimeType();

        $allowed = [
            'image/jpeg', 'image/png', 'image/webp',
            'video/mp4', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/aac',
        ];

        if (! in_array($finfoMime, $allowed, true)) {
            throw ValidationException::withMessages([
                'file' => ['Unsupported media type.'],
            ]);
        }

        $mediaType = Str::startsWith($finfoMime, 'image/') ? 'image'
            : (Str::startsWith($finfoMime, 'video/') ? 'video' : 'audio');

        $ext = $file->guessExtension() ?: 'bin';
        $randomName = (string) Str::uuid().'.'.$ext;
        $path = $request->user()->id.'/'.$memory->id.'/'.$randomName;
        $disk = config('filesystems.default', 'local');

        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        $media = Media::create([
            'user_id' => $request->user()->id,
            'memory_id' => $memory->id,
            'journal_entry_id' => null,
            'type' => $mediaType,
            'media_type' => $mediaType,
            'disk' => $disk,
            'path' => $path,
            'file_path' => $path,
            'thumbnail_path' => null,
            'original_filename' => $file->getClientOriginalName(),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $finfoMime,
            'file_size' => $file->getSize(),
            'size' => $file->getSize(),
            'sort_order' => (int) $memory->media()->count(),
        ]);

        return (new MediaResource($media))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Memory $memory, Media $media)
    {
        $this->authorize('update', $memory);

        if ($media->memory_id !== $memory->id || $media->user_id !== $request->user()->id) {
            abort(404);
        }

        if ($media->path) {
            Storage::disk($media->disk ?: config('filesystems.default', 'local'))->delete($media->path);
        } elseif ($media->file_path) {
            Storage::disk($media->disk ?: config('filesystems.default', 'local'))->delete($media->file_path);
        }

        $media->delete();

        return response()->noContent();
    }
}
