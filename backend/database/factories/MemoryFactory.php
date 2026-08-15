<?php

namespace Database\Factories;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Memory>
 */
class MemoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'            => User::factory(),
            'trip_id'            => Trip::factory(),
            'itinerary_item_id'  => null,
            'journal_entry_id'   => null,
            'title'              => fake()->sentence(4),
            'description'        => fake()->optional()->paragraph(),
            'memory_date'        => fake()->dateTimeBetween('-2 years', 'now')->format('Y-m-d'),
            'visibility'         => 'private',
        ];
    }
}
