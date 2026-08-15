<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds mood_emoji, mood_label, location_name, latitude, longitude,
 * and location_source to journal_entries.
 *
 * mood_emoji  — Unicode emoji character chosen by the user (e.g. "😀")
 * mood_label  — Free-text label for the mood (e.g. "Happy")
 *               When both are set the mood enum can remain null for
 *               custom moods, or match the legacy enum for backwards compat.
 * location_name   — Human-readable place name (e.g. "Tagaytay, Cavite")
 * latitude        — Decimal latitude  (nullable — location is always optional)
 * longitude       — Decimal longitude (nullable)
 * location_source — How the location was obtained: geolocation | search | manual
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('journal_entries', 'mood_emoji')) {
                // Single emoji character — up to 8 bytes to accommodate multi-codepoint emojis
                $table->string('mood_emoji', 32)->nullable()->after('mood');
            }
            if (! Schema::hasColumn('journal_entries', 'mood_label')) {
                $table->string('mood_label', 100)->nullable()->after('mood_emoji');
            }
            if (! Schema::hasColumn('journal_entries', 'location_name')) {
                $table->string('location_name', 255)->nullable()->after('weather');
            }
            if (! Schema::hasColumn('journal_entries', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('location_name');
            }
            if (! Schema::hasColumn('journal_entries', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
            if (! Schema::hasColumn('journal_entries', 'location_source')) {
                // geolocation = browser GPS, search = user searched, manual = typed
                $table->enum('location_source', ['geolocation', 'search', 'manual'])
                      ->nullable()
                      ->after('longitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropColumnIfExists('mood_emoji');
            $table->dropColumnIfExists('mood_label');
            $table->dropColumnIfExists('location_name');
            $table->dropColumnIfExists('latitude');
            $table->dropColumnIfExists('longitude');
            $table->dropColumnIfExists('location_source');
        });
    }
};
