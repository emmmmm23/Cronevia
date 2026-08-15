<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('itinerary_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('trip_day_id');
            $table->uuid('location_id')->nullable();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->time('scheduled_time')->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->enum('category', [
                'accommodation', 'restaurant', 'attraction', 'transport',
                'activity', 'shopping', 'nature', 'other',
            ])->nullable();
            $table->enum('status', ['planned', 'visited', 'skipped'])->default('planned');
            $table->unsignedInteger('sort_order')->default(1);
            $table->boolean('converted_to_memory')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('trip_day_id')->references('id')->on('trip_days')->cascadeOnDelete();
            $table->foreign('location_id')->references('id')->on('locations')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('itinerary_items');
    }
};
