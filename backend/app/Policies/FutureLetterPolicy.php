<?php

namespace App\Policies;

use App\Models\FutureLetter;
use App\Models\User;

class FutureLetterPolicy
{
    public function view(User $user, FutureLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }

    public function delete(User $user, FutureLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }
}
