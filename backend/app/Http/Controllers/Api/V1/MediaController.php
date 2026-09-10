<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaResource;
use App\Models\Media;
use App\Models\Memory;
use App\Models\JournalEntry;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    /**
     * Upload media to a memory.
     * POST /api/v1/memories/{memory}/media
     */
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

    /**
     * Upload media to a journal entry.
     * POST /api/v1/journal/{entry}/media
     */
    public function storeForJournal(Request $request, JournalEntry $entry)
    {
        $this->authorize('update', $entry);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'], // 10MB max for images
        ]);

        $file = $validated['file'];
        
        // Double-check MIME type for security
        $finfoMime = mime_content_type($file->getRealPath()) ?: $file->getMimeType();
        
        $allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!in_array($finfoMime, $allowedImages, true)) {
            throw ValidationException::withMessages([
                'file' => ['Only JPG, JPEG, PNG, and WEBP images are allowed.'],
            ]);
        }

        // Generate secure filename
        $ext = $file->guessExtension() ?: 'jpg';
        $randomName = (string) Str::uuid() . '.' . $ext;
        $path = 'journal/' . $request->user()->id . '/' . $entry->id . '/' . $randomName;
        $disk = config('filesystems.default', 'local');

        // Store file
        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        // Create media record
        $media = Media::create([
            'user_id' => $request->user()->id,
            'memory_id' => null,
            'journal_entry_id' => $entry->id,
            'type' => 'image',
            'media_type' => 'image',
            'disk' => $disk,
            'path' => $path,
            'file_path' => $path,
            'thumbnail_path' => null,
            'original_filename' => $file->getClientOriginalName(),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $finfoMime,
            'file_size' => $file->getSize(),
            'size' => $file->getSize(),
            'sort_order' => (int) Media::where('journal_entry_id', $entry->id)->count(),
        ]);

        return response()->json([
            'message' => 'Photo uploaded successfully.',
            'data' => new MediaResource($media),
        ], 201);
    }

    /**
     * Delete media from a memory.
     * DELETE /api/v1/memories/{memory}/media/{media}
     */
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

    /**
     * Delete media from a journal entry.
     * DELETE /api/v1/journal/{entry}/media/{media}
     */
    public function destroyForJournal(Request $request, JournalEntry $entry, Media $media)
    {
        $this->authorize('update', $entry);

        // Verify ownership and relationship
        if ($media->journal_entry_id !== $entry->id || $media->user_id !== $request->user()->id) {
            abort(404);
        }

        // Delete file from storage
        if ($media->path) {
            Storage::disk($media->disk ?: config('filesystems.default', 'local'))->delete($media->path);
        } elseif ($media->file_path) {
            Storage::disk($media->disk ?: config('filesystems.default', 'local'))->delete($media->file_path);
        }

        $media->delete();

        return response()->noContent();
    }

    /**
     * Upload media to a trip (cover photo or gallery).
     * POST /api/v1/trips/{trip}/media
     */
    public function storeForTrip(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'], // 10MB max
            'is_cover' => ['sometimes', 'boolean'],
        ]);

        $file = $validated['file'];
        
        // Double-check MIME type for security
        $finfoMime = mime_content_type($file->getRealPath()) ?: $file->getMimeType();
        
        $allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!in_array($finfoMime, $allowedImages, true)) {
            throw ValidationException::withMessages([
                'file' => ['Only JPG, JPEG, PNG, and WEBP images are allowed.'],
            ]);
        }

        // Generate secure filename
        $ext = $file->guessExtension() ?: 'jpg';
        $randomName = (string) Str::uuid() . '.' . $ext;
        $path = 'trips/' . $request->user()->id . '/' . $trip->id . '/' . $randomName;
        $disk = config('filesystems.default', 'local');

        // Store file
        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        // Create media record
        $media = Media::create([
            'user_id' => $request->user()->id,
            'memory_id' => null,
            'journal_entry_id' => null,
            'trip_id' => $trip->id,
            'type' => 'image',
            'media_type' => 'image',
            'disk' => $disk,
            'path' => $path,
            'file_path' => $path,
            'thumbnail_path' => null,
            'original_filename' => $file->getClientOriginalName(),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $finfoMime,
            'file_size' => $file->getSize(),
            'size' => $file->getSize(),
            'sort_order' => (int) Media::where('trip_id', $trip->id)->count(),
        ]);

        // If this is marked as cover photo, update the trip
        if ($validated['is_cover'] ?? false) {
            $trip->cover_image_path = $path;
            $trip->cover_media_id = $media->id;
            $trip->save();
        }

        return response()->json([
            'message' => 'Photo uploaded successfully.',
            'data' => new MediaResource($media),
        ], 201);
    }

    /**
     * Delete media from a trip.
     * DELETE /api/v1/trips/{trip}/media/{media}
     */
    public function destroyForTrip(Request $request, Trip $trip, Media $media)
    {
        $this->authorize('update', $trip);

        // Verify ownership and relationship
        if ($media->trip_id !== $trip->id || $media->user_id !== $request->user()->id) {
            abort(404);
        }

        // If this was the cover photo, clear it from the trip
        if ($trip->cover_media_id === $media->id) {
            $trip->cover_image_path = null;
            $trip->cover_media_id = null;
            $trip->save();
        }

        // Delete file from storage
        if ($media->path) {
            Storage::disk($media->disk ?: config('filesystems.default', 'local'))->delete($media->path);
        } elseif ($media->file_path) {
            Storage::disk($media->disk ?: config('filesystems.default', 'local'))->delete($media->file_path);
        }

        $media->delete();

        return response()->noContent();
    }

    /**
     * Set a media as the cover photo for a trip.
     * PATCH /api/v1/trips/{trip}/media/{media}/set-cover
     */
    public function setCoverPhoto(Request $request, Trip $trip, Media $media)
    {
        $this->authorize('update', $trip);

        // Verify ownership and relationship
        if ($media->trip_id !== $trip->id || $media->user_id !== $request->user()->id) {
            abort(404);
        }

        $trip->cover_image_path = $media->path ?? $media->file_path;
        $trip->cover_media_id = $media->id;
        $trip->save();

        return response()->json([
            'message' => 'Cover photo updated.',
            'data' => new MediaResource($media),
        ]);
    }
}
