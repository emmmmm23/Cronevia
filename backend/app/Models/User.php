<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    use HasFactory, HasUuids, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar_path',
        'timezone',
        'locale',
        'status',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'password_hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
        ];
    }

    public function setPasswordAttribute($value): void
    {
        $this->attributes['password_hash'] = Hash::make($value);
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function memories(): HasMany
    {
        return $this->hasMany(Memory::class);
    }

    public function timeCapsules(): HasMany
    {
        return $this->hasMany(TimeCapsule::class);
    }

    public function futureLetters(): HasMany
    {
        return $this->hasMany(FutureLetter::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    public function people(): HasMany
    {
        return $this->hasMany(Person::class);
    }

    /**
     * Check if the user is a Super Admin.
     *
     * @return bool
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /**
     * Check if the user is a normal user.
     *
     * @return bool
     */
    public function isNormalUser(): bool
    {
        return $this->role === 'user';
    }

    /**
     * Check if the user is active.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Scope to get only Super Admins.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSuperAdmins($query)
    {
        return $query->where('role', 'super_admin');
    }

    /**
     * Scope to get only normal users.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeNormalUsers($query)
    {
        return $query->where('role', 'user');
    }

    /**
     * Get the count of Super Admin accounts.
     *
     * @return int
     */
    public static function superAdminCount(): int
    {
        return static::where('role', 'super_admin')->count();
    }

    /**
     * Get the first/only Super Admin account.
     *
     * @return \App\Models\User|null
     */
    public static function getSuperAdmin(): ?User
    {
        return static::where('role', 'super_admin')->first();
    }
}
