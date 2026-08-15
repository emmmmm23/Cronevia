<?php

namespace Database\Factories;

use App\Models\Trip;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TripDay>
 */
class TripDayFactory extends Factory
{
    public function definition(): array
    {
        return [
            'trip_id'    => Trip::factory(),
            'date'       => fake()->dateTimeBetween('-1 year', '+1 year')->format('Y-m-d'),
            'day_number' => 1,
            'title'      => fake()->optional()->words(3, true),
            'notes'      => fake()->optional()->paragraph(),
        ];
    }
}
