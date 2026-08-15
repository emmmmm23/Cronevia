<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Memories are created before journal_entries and media because both FK back
     * to memories. itinerary_item_id and journal_entry_id are nullable — the latter
     * will be added as a proper FK once journal_entries exists. We use a deferred
     * approach: the column is defined here as a plain uuid, and the FK constraint
     * is added in the journal_entries migration via a separate index.
     *
     * Note: journal_entry_id FK is intentionally omitted here to avoid a circular
     * dependency (journal_entries also references memories). It can be enforced at
     * the application layer via Eloquent or added after both tables exist.
     */
    public function up(): void
    {
        Schema::create('memories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('trip_id')->nullable();
            $table->uuid('itinerary_item_id')->nullable();
            $table->uuid('journal_entry_id')->nullable();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->date('memory_date');
            $table->enum('visibility', ['private', 'public', 'friends'])->default('private');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('trip_id')->references('id')->on('trips')->nullOnDelete();
            $table->foreign('itinerary_item_id')->references('id')->on('itinerary_items')->nullOnDelete();
            // journal_entry_id FK added after journal_entries table is created
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('memories');
    }
};
