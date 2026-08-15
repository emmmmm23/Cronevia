<?php

namespace Database\Seeders;

use App\Models\FutureLetter;
use App\Models\ItineraryItem;
use App\Models\JournalEntry;
use App\Models\Location;
use App\Models\Memory;
use App\Models\Person;
use App\Models\Tag;
use App\Models\TimeCapsule;
use App\Models\User;
use App\Models\Trip;
use App\Models\TripDay;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $trip = Trip::factory()->create([
            'user_id' => $user->id,
            'title' => 'Batangas Weekend',
            'destination' => 'Batangas',
            'currency' => 'PHP',
            'budget' => 15000.00,
        ]);

        $day = TripDay::factory()->create([
            'trip_id' => $trip->id,
            'day_number' => 1,
            'date' => now()->toDateString(),
            'title' => 'Arrival Day',
        ]);

        $location = Location::factory()->create([
            'user_id' => $user->id,
            'name' => 'Anilao Dive Spot',
            'latitude' => 13.7576,
            'longitude' => 120.9319,
        ]);

        $item = ItineraryItem::factory()->create([
            'trip_day_id' => $day->id,
            'location_id' => $location->id,
            'title' => 'Sunset walk',
        ]);

        $entry = JournalEntry::factory()->create([
            'user_id' => $user->id,
            'trip_id' => $trip->id,
            'trip_day_id' => $day->id,
            'itinerary_item_id' => $item->id,
            'location_id' => $location->id,
        ]);

        $memory = Memory::factory()->create([
            'user_id' => $user->id,
            'trip_id' => $trip->id,
            'itinerary_item_id' => $item->id,
            'journal_entry_id' => $entry->id,
            'location_id' => $location->id,
            'title' => 'First Batangas Sunset',
        ]);

        $tag = Tag::factory()->create(['user_id' => $user->id, 'name' => 'sunset']);
        $person = Person::factory()->create(['user_id' => $user->id]);

        $memory->tags()->syncWithoutDetaching([$tag->id]);
        $memory->people()->syncWithoutDetaching([$person->id]);

        TimeCapsule::factory()->create([
            'user_id' => $user->id,
            'title' => 'Open next year',
        ]);

        FutureLetter::factory()->create([
            'user_id' => $user->id,
            'subject' => 'Dear future me',
        ]);
    }
}
