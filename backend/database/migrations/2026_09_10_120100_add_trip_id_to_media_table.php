<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add trip_id to media table to support photo attachments for trips.
 * Media can belong to: memory, journal entry, or trip.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            if (!Schema::hasColumn('media', 'trip_id')) {
                $table->uuid('trip_id')->nullable()->after('journal_entry_id');
                $table->foreign('trip_id')
                      ->references('id')
                      ->on('trips')
                      ->nullOnDelete();
                $table->index('trip_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropForeign(['trip_id']);
            $table->dropIndex(['trip_id']);
            $table->dropColumn('trip_id');
        });
    }
};
