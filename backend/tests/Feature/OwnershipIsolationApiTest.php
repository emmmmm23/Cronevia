<?php

namespace Tests\Feature;

use App\Models\FutureLetter;
use App\Models\JournalEntry;
use App\Models\Memory;
use App\Models\TimeCapsule;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnershipIsolationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_access_another_users_trip(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $trip = Trip::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->getJson('/api/v1/trips/'.$trip->id)
            ->assertStatus(403);
    }

    public function test_user_cannot_access_another_users_journal(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $journal = JournalEntry::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->getJson('/api/v1/journal/'.$journal->id)
            ->assertStatus(403);
    }

    public function test_user_cannot_access_another_users_memory(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $memory = Memory::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->getJson('/api/v1/memories/'.$memory->id)
            ->assertStatus(403);
    }

    public function test_user_cannot_access_another_users_time_capsule(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $capsule = TimeCapsule::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->getJson('/api/v1/time-capsules/'.$capsule->id)
            ->assertStatus(403);
    }

    public function test_user_cannot_access_another_users_future_letter(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $letter = FutureLetter::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->getJson('/api/v1/future-letters/'.$letter->id)
            ->assertStatus(403);
    }
}
