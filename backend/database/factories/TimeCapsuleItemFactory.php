<?php

namespace Database\Factories;

use App\Models\Memory;
use App\Models\TimeCapsule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TimeCapsuleItem>
 */
class TimeCapsuleItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'capsule_id' => TimeCapsule::factory(),
            'item_type'  => Memory::class,
            'item_id'    => fake()->uuid(),
            'sort_order' => 0,
        ];
    }
}
