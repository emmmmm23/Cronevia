<?php

namespace App\Policies;

use App\Models\TimeCapsule;
use App\Models\User;

class TimeCapsulePolicy
{
    public function view(User $user, TimeCapsule $capsule): bool
    {
        return $user->id === $capsule->user_id;
    }

    public function update(User $user, TimeCapsule $capsule): bool
    {
        return $user->id === $capsule->user_id;
    }

    public function delete(User $user, TimeCapsule $capsule): bool
    {
        return $user->id === $capsule->user_id;
    }
}
