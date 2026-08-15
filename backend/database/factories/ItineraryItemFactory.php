<?php

namespace Database\Factories;

use App\Models\TripDay;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ItineraryItem>
 */
class ItineraryItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'trip_day_id'          => TripDay::factory(),
            'location_id'          => null,
            'title'                => fake()->sentence(4),
            'description'          => fake()->optional()->paragraph(),
            'scheduled_time'       => null,
            'duration_minutes'     => null,
            'category'             => null,
            'status'               => 'planned',
            'sort_order'           => 1,
            'converted_to_memory'  => false,
        ];
    }
}
