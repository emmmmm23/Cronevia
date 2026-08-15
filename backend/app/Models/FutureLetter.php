<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FutureLetter extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'recipient_email',
        'subject',
        'content',
        'deliver_at',
        'status',
        'is_delivered',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'content'      => 'encrypted',
            'deliver_at'   => 'datetime',
            'delivered_at' => 'datetime',
            'is_delivered' => 'boolean',
            'updated_at'   => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
