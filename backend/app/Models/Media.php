<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Media extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'memory_id',
        'journal_entry_id',
        'trip_id',
        'disk',
        'path',
        'type',
        'media_type',
        'file_path',
        'thumbnail_path',
        'original_filename',
        'original_name',
        'file_size',
        'size',
        'mime_type',
        'width',
        'height',
        'duration',
        'exif_data',
        'extracted_location',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'exif_data'          => 'array',
            'extracted_location' => 'array',
            'created_at'         => 'datetime',
            'updated_at'         => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function memory(): BelongsTo
    {
        return $this->belongsTo(Memory::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    /**
     * Get the URL for this media file.
     * In production, this would use Storage::url() or a CDN.
     */
    public function getUrlAttribute(): string
    {
        $path = $this->path ?? $this->file_path;
        if (!$path) {
            return '';
        }
        // For local storage, generate a URL
        // In production, use Storage::url($path) if configured
        return url('storage/' . $path);
    }
}
