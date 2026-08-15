<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\FutureLetter>
 */
class FutureLetterFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'         => User::factory(),
            'recipient_email' => fake()->safeEmail(),
            'subject'         => fake()->sentence(4),
            'content'         => fake()->paragraph(),
            'deliver_at'      => fake()->dateTimeBetween('+1 month', '+3 years'),
            'is_delivered'    => false,
            'delivered_at'    => null,
        ];
    }
}
