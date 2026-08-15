<?php

namespace Tests\Feature;

use App\Models\FutureLetter;
use App\Models\Memory;
use App\Models\TimeCapsule;
use App\Models\TimeCapsuleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimeCapsuleAndFutureLetterPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_locked_time_capsule_hides_items(): void
    {
        $user = User::factory()->create();
        $capsule = TimeCapsule::factory()->create([
            'user_id' => $user->id,
            'is_unlocked' => false,
            'status' => 'locked',
            'unlock_at' => now()->addDay(),
        ]);

        $memory = Memory::factory()->create(['user_id' => $user->id]);

        TimeCapsuleItem::factory()->create([
            'capsule_id' => $capsule->id,
            'item_type' => Memory::class,
            'item_id' => $memory->id,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/time-capsules/'.$capsule->id)
            ->assertStatus(200)
            ->assertJsonMissingPath('data.items');
    }

    public function test_unlocked_time_capsule_shows_items(): void
    {
        $user = User::factory()->create();
        $capsule = TimeCapsule::factory()->create([
            'user_id' => $user->id,
            'is_unlocked' => true,
            'status' => 'unlocked',
            'unlock_at' => now()->subDay(),
        ]);

        $memory = Memory::factory()->create(['user_id' => $user->id]);

        TimeCapsuleItem::factory()->create([
            'capsule_id' => $capsule->id,
            'item_type' => Memory::class,
            'item_id' => $memory->id,
        ]);

        $response =         $response = $this->actingAs($user)
            ->getJson('/api/v1/time-capsules/'.$capsule->id)
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['items']]);
    }

    public function test_future_letter_hides_content_before_deliver_at(): void
    {
        $user = User::factory()->create();

        $letter = FutureLetter::factory()->create([
            'user_id' => $user->id,
            'status' => 'locked',
            'deliver_at' => now()->addDay(),
            'content' => 'Secret text',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/future-letters/'.$letter->id)
            ->assertStatus(200)
            ->assertJsonMissingPath('content');
    }
}
