<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'audit_logs';

    protected $fillable = [
        'event_type',
        'user_id',
        'target_user_id',
        'ip_address',
        'user_agent',
        'data',
        'environment',
    ];

    protected $casts = [
        'data' => 'json',
    ];

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who was affected by the action.
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Scope to get only Super Admin related events.
     */
    public function scopeSuperAdminEvents($query)
    {
        return $query->whereIn('event_type', [
            'super_admin_created',
            'super_admin_login',
            'super_admin_login_failed',
            'super_admin_replaced',
        ]);
    }

    /**
     * Scope to get only security-critical events.
     */
    public function scopeSecurityEvents($query)
    {
        return $query->whereIn('event_type', [
            'super_admin_created',
            'super_admin_login',
            'super_admin_login_failed',
            'super_admin_replaced',
            'user_suspended',
            'user_deleted',
            'role_changed',
        ]);
    }
}
