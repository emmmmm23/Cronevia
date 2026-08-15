<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * After this table is created we also add the deferred FK from memories
     * back to journal_entries, resolving the circular dependency.
     */
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('trip_id')->nullable();
            $table->uuid('trip_day_id')->nullable();
            $table->uuid('itinerary_item_id')->nullable();
            $table->string('title', 255);
            $table->text('content');
            $table->enum('mood', [
                'happy', 'excited', 'peaceful', 'nostalgic',
                'sad', 'anxious', 'neutral',
            ])->nullable();
            $table->enum('visibility', ['private', 'public', 'friends'])->default('private');
            $table->date('entry_date');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('trip_id')->references('id')->on('trips')->nullOnDelete();
            $table->foreign('trip_day_id')->references('id')->on('trip_days')->nullOnDelete();
            $table->foreign('itinerary_item_id')->references('id')->on('itinerary_items')->nullOnDelete();
        });

        // Resolve the circular dependency: add FK from memories.journal_entry_id
        Schema::table('memories', function (Blueprint $table) {
            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the deferred FK on memories first
        Schema::table('memories', function (Blueprint $table) {
            $table->dropForeign(['journal_entry_id']);
        });

        Schema::dropIfExists('journal_entries');
    }
};
