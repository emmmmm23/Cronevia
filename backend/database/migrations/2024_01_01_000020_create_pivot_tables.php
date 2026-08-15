<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the two pivot tables that were missing from the original migrations:
     *
     *   taggables  — polymorphic pivot linking tags to any taggable resource
     *                (memories, journal_entries, trips, itinerary_items, etc.)
     *
     *   trip_people — simple pivot linking trips to people (travel companions)
     *
     * Note: memory_people is already created in harden_cronevia_mysql_schema.php.
     * Note: memory_tags (non-polymorphic tag pivot for memories) is also already
     *       created there, but taggables is the canonical polymorphic table used
     *       by the Tag model's morphedByMany() relationships.
     */
    public function up(): void
    {
        // Polymorphic taggables pivot
        if (! Schema::hasTable('taggables')) {
            Schema::create('taggables', function (Blueprint $table) {
                $table->uuid('tag_id');
                $table->uuid('taggable_id');
                $table->string('taggable_type');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('tag_id')->references('id')->on('tags')->cascadeOnDelete();

                // Composite unique to prevent duplicate tag assignments
                $table->unique(['tag_id', 'taggable_id', 'taggable_type']);

                // Indexes for polymorphic lookups (taggable_type + taggable_id)
                // and for reverse lookups (all tags on a resource)
                $table->index(['taggable_type', 'taggable_id']);
                $table->index('tag_id');
            });
        }

        // Trip–People pivot (travel companions on a trip)
        if (! Schema::hasTable('trip_people')) {
            Schema::create('trip_people', function (Blueprint $table) {
                $table->uuid('trip_id');
                $table->uuid('person_id');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
                $table->foreign('person_id')->references('id')->on('people')->cascadeOnDelete();

                $table->unique(['trip_id', 'person_id']);
                $table->index('trip_id');
                $table->index('person_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_people');
        Schema::dropIfExists('taggables');
    }
};
