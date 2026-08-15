<?php

use App\Models\FutureLetter;
use App\Models\JournalEntry;
use App\Models\Memory;
use App\Models\TimeCapsule;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(Tests\TestCase::class, RefreshDatabase::class);

// ─────────────────────────────────────────────────────────────────────────────
// Requirement 9.1 — FutureLetter content is encrypted at rest (Eloquent cast)
// ─────────────────────────────────────────────────────────────────────────────

it('encrypts FutureLetter content at rest and decrypts it on access via cast', function () {
    $plainText = 'Dear future me, you made it through 2026!';

    $letter = FutureLetter::factory()->create(['content' => $plainText]);

    // Raw database column value must NOT equal the plain-text string
    $rawContent = DB::table('future_letters')
        ->where('id', $letter->id)
        ->value('content');

    expect($rawContent)->not->toBe($plainText);
    expect($rawContent)->not->toBeEmpty();

    // Eloquent model accessor must transparently decrypt back to plain text
    $letter->refresh();
    expect($letter->content)->toBe($plainText);
});

it('produces different ciphertext for different FutureLetter content values', function () {
    $letterA = FutureLetter::factory()->create(['content' => 'Message alpha']);
    $letterB = FutureLetter::factory()->create(['content' => 'Message beta']);

    $rawA = DB::table('future_letters')->where('id', $letterA->id)->value('content');
    $rawB = DB::table('future_letters')->where('id', $letterB->id)->value('content');

    expect($rawA)->not->toBe($rawB);
});

// ─────────────────────────────────────────────────────────────────────────────
// Requirement 14.3 — All resources are assigned a UUID v4 primary key
// ─────────────────────────────────────────────────────────────────────────────

$uuidV4Pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

it('assigns a UUID v4 primary key to User on creation', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    expect($user->id)->toMatch($uuidV4Pattern);
});

it('assigns a UUID v4 primary key to Trip on creation', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    $trip = Trip::factory()->create(['user_id' => $user->id]);
    expect($trip->id)->toMatch($uuidV4Pattern);
});

it('assigns a UUID v4 primary key to Memory on creation', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    $trip = Trip::factory()->create(['user_id' => $user->id]);
    $memory = Memory::factory()->create(['user_id' => $user->id, 'trip_id' => $trip->id]);
    expect($memory->id)->toMatch($uuidV4Pattern);
});

it('assigns a UUID v4 primary key to JournalEntry on creation', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    $trip = Trip::factory()->create(['user_id' => $user->id]);
    $entry = JournalEntry::factory()->create(['user_id' => $user->id, 'trip_id' => $trip->id]);
    expect($entry->id)->toMatch($uuidV4Pattern);
});

it('assigns a UUID v4 primary key to TimeCapsule on creation', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    $capsule = TimeCapsule::factory()->create(['user_id' => $user->id]);
    expect($capsule->id)->toMatch($uuidV4Pattern);
});

it('assigns a UUID v4 primary key to FutureLetter on creation', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    $letter = FutureLetter::factory()->create(['user_id' => $user->id]);
    expect($letter->id)->toMatch($uuidV4Pattern);
});

it('assigns unique UUID v4 ids to each model instance', function () use ($uuidV4Pattern) {
    $user = User::factory()->create();
    $trip = Trip::factory()->create(['user_id' => $user->id]);

    $memory1 = Memory::factory()->create(['user_id' => $user->id, 'trip_id' => $trip->id]);
    $memory2 = Memory::factory()->create(['user_id' => $user->id, 'trip_id' => $trip->id]);

    expect($memory1->id)->not->toBe($memory2->id);
    expect($memory1->id)->toMatch($uuidV4Pattern);
    expect($memory2->id)->toMatch($uuidV4Pattern);
});
