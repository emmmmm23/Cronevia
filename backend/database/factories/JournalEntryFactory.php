<?php

namespace Database\Factories;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\JournalEntry>
 */
class JournalEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'            => User::factory(),
            'trip_id'            => Trip::factory(),
            'trip_day_id'        => null,
            'itinerary_item_id'  => null,
            'title'              => fake()->sentence(4),
            'content'            => fake()->paragraph(),
            'mood'               => fake()->randomElement(['happy', 'excited', 'peaceful', 'nostalgic', 'sad', 'anxious', 'neutral']),
            'visibility'         => 'private',
            'entry_date'         => fake()->dateTimeBetween('-2 years', 'now')->format('Y-m-d'),
        ];
    }
}
