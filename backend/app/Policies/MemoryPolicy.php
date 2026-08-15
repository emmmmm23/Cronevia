<?php

namespace App\Policies;

use App\Models\Memory;
use App\Models\User;

class MemoryPolicy
{
    public function view(User $user, Memory $memory): bool
    {
        return $user->id === $memory->user_id;
    }

    public function update(User $user, Memory $memory): bool
    {
        return $user->id === $memory->user_id;
    }

    public function delete(User $user, Memory $memory): bool
    {
        return $user->id === $memory->user_id;
    }
}
