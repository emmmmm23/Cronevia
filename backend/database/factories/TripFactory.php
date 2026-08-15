<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Trip>
 */
class TripFactory extends Factory
{
    public function definition(): array
    {
        $title     = fake()->sentence(3);
        $slug      = Str::slug($title);
        $startDate = fake()->dateTimeBetween('-2 years', '+1 year');
        $endDate   = (clone $startDate)->modify('+7 days');

        return [
            'user_id'     => User::factory(),
            'title'       => $title,
            'slug'        => $slug,
            'description' => fake()->optional()->paragraph(),
            'start_date'  => $startDate->format('Y-m-d'),
            'end_date'    => $endDate->format('Y-m-d'),
            'status'      => 'planning',
            'visibility'  => 'private',
            'country_codes' => null,
            'metadata'    => null,
        ];
    }
}
