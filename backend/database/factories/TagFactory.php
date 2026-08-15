<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tag>
 */
class TagFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'   => User::factory(),
            'name'      => fake()->unique()->word(),
            'color_hex' => sprintf('#%02X%02X%02X', rand(0, 255), rand(0, 255), rand(0, 255)),
        ];
    }
}
