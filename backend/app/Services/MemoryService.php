<?php

namespace App\Services;

use App\Models\ItineraryItem;
use App\Models\JournalEntry;
use App\Models\Memory;
use App\Models\Trip;
use App\Models\TripDay;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MemoryService
{
    public function convertItineraryItemToMemory(ItineraryItem $item, Trip $trip, TripDay $day, array $payload = []): Memory
    {
        if ((bool) $item->converted_to_memory) {
            throw ValidationException::withMessages([
                'item' => ['This itinerary item has already been converted to a memory.'],
            ]);
        }

        $memoryTitle = $item->title ?: $day->title ?: $trip->title;

        return DB::transaction(function () use ($item, $trip, $day, $payload, $memoryTitle) {
            $item->status = 'visited';
            $item->converted_to_memory = true;
            $item->save();

            $memory = Memory::create([
                'user_id' => $trip->user_id,
                'trip_id' => $trip->id,
                'itinerary_item_id' => $item->id,
                'title' => $memoryTitle,
                'description' => $item->description,
                'memory_date' => $day->date,
                'visibility' => 'private',
            ]);

            if (! empty($payload['journal_content']) || array_key_exists('mood', $payload)) {
                $journalContent = $payload['journal_content'] ?? '';

                $journalEntry = JournalEntry::create([
                    'user_id' => $trip->user_id,
                    'trip_id' => $trip->id,
                    'trip_day_id' => $day->id,
                    'itinerary_item_id' => $item->id,
                    'memory_id' => $memory->id,
                    'title' => $memoryTitle,
                    'content' => $journalContent,
                    'mood' => $payload['mood'] ?? null,
                    'visibility' => 'private',
                    'entry_date' => $day->date,
                ]);

                $memory->journal_entry_id = $journalEntry->id;
                $memory->save();
            }

            return $memory->fresh();
        });
    }
}
