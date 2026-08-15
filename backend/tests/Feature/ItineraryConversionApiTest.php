<?php

namespace Tests\Feature;

use App\Models\ItineraryItem;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItineraryConversionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_convert_itinerary_item_to_memory(): void
    {
        $user = User::factory()->create();
        $trip = Trip::factory()->create(['user_id' => $user->id]);
        $day = TripDay::factory()->create([
            'trip_id' => $trip->id,
            'date' => '2024-05-10',
        ]);
        $item = ItineraryItem::factory()->create([
            'trip_day_id' => $day->id,
            'title' => 'Museum visit',
            'description' => 'Explored the local museum.',
            'status' => 'planned',
            'converted_to_memory' => false,
        ]);

        $response = $this->actingAs($user)->postJson(
            "/api/v1/trips/{$trip->id}/days/{$day->id}/itinerary/{$item->id}/convert",
            ['journal_content' => 'Loved the exhibition and the quiet galleries.', 'mood' => 'happy']
        );

        $response->assertStatus(201)
            ->assertJsonPath('title', 'Museum visit')
            ->assertJsonPath('trip_id', $trip->id);

        $this->assertDatabaseHas('memories', [
            'trip_id' => $trip->id,
            'itinerary_item_id' => $item->id,
            'title' => 'Museum visit',
        ]);

        $this->assertDatabaseHas('journal_entries', [
            'itinerary_item_id' => $item->id,
            'mood' => 'happy',
        ]);

        $this->assertTrue($item->fresh()->converted_to_memory);
    }

    public function test_converted_itinerary_item_returns_422_and_does_not_duplicate_memory(): void
    {
        $user = User::factory()->create();
        $trip = Trip::factory()->create(['user_id' => $user->id]);
        $day = TripDay::factory()->create(['trip_id' => $trip->id]);
        $item = ItineraryItem::factory()->create([
            'trip_day_id' => $day->id,
            'converted_to_memory' => true,
        ]);

        $response = $this->actingAs($user)->postJson(
            "/api/v1/trips/{$trip->id}/days/{$day->id}/itinerary/{$item->id}/convert"
        );

        $response->assertStatus(422)
            ->assertJsonPath('message', 'This itinerary item has already been converted to a memory.');

        $this->assertDatabaseCount('memories', 0);
    }

    public function test_other_user_cannot_convert_another_users_itinerary_item(): void
    {
        $owner = User::factory()->create();
        $anotherUser = User::factory()->create();
        $trip = Trip::factory()->create(['user_id' => $owner->id]);
        $day = TripDay::factory()->create(['trip_id' => $trip->id]);
        $item = ItineraryItem::factory()->create(['trip_day_id' => $day->id]);

        $response = $this->actingAs($anotherUser)->postJson(
            "/api/v1/trips/{$trip->id}/days/{$day->id}/itinerary/{$item->id}/convert"
        );

        $response->assertStatus(403);
    }
}
