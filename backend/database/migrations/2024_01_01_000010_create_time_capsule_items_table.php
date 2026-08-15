<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Uses a polymorphic relationship (item_type + item_id) for morphTo,
     * allowing time capsule items to reference memories, journal entries, or media.
     * item_id is stored as uuid (char 36) to match UUID v4 PKs on all referenced tables.
     */
    public function up(): void
    {
        Schema::create('time_capsule_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('capsule_id');
            $table->string('item_type');       // e.g. App\Models\Memory
            $table->uuid('item_id');           // UUID of the referenced record
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('capsule_id')->references('id')->on('time_capsules')->cascadeOnDelete();

            // Index for polymorphic lookups
            $table->index(['item_type', 'item_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_capsule_items');
    }
};
