<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Location>
 */
class LocationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'name'         => fake()->city(),
            'address'      => fake()->optional()->streetAddress(),
            'country_code' => fake()->countryCode(),
            'city'         => fake()->city(),
            'latitude'     => fake()->latitude(),
            'longitude'    => fake()->longitude(),
            'category'     => fake()->optional()->randomElement(['accommodation', 'restaurant', 'attraction', 'transport', 'activity', 'shopping', 'nature', 'other']),
        ];
    }
}
