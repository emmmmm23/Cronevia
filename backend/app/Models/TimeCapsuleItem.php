<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TimeCapsuleItem extends Model
{
    use HasFactory, HasUuids;

    /**
     * Disable automatic timestamps; only created_at is managed.
     */
    public $timestamps = false;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'capsule_id',
        'item_type',
        'item_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            $model->created_at = now();
        });
    }

    public function capsule(): BelongsTo
    {
        return $this->belongsTo(TimeCapsule::class, 'capsule_id');
    }

    /**
     * Polymorphic relation: item can be a Memory, JournalEntry, or Media.
     */
    public function item(): MorphTo
    {
        return $this->morphTo('item', 'item_type', 'item_id');
    }
}
