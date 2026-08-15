<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TimeCapsule>
 */
class TimeCapsuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'     => User::factory(),
            'title'       => fake()->sentence(3),
            'description' => fake()->optional()->paragraph(),
            'unlock_at'   => fake()->dateTimeBetween('+1 month', '+2 years'),
            'is_unlocked' => false,
            'unlocked_at' => null,
            'visibility'  => 'private',
        ];
    }
}
