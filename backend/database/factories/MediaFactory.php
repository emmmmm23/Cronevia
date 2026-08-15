<?php

namespace Database\Factories;

use App\Models\Memory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Media>
 */
class MediaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'            => User::factory(),
            'memory_id'          => Memory::factory(),
            'type'               => 'image',
            'file_path'          => fake()->uuid() . '.jpg',
            'thumbnail_path'     => null,
            'original_filename'  => fake()->word() . '.jpg',
            'file_size'          => fake()->numberBetween(100000, 5000000),
            'mime_type'          => 'image/jpeg',
            'exif_data'          => null,
            'extracted_location' => null,
            'sort_order'         => 0,
        ];
    }
}
