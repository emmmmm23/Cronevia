<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Composite index on (is_unlocked, unlock_at) supports the Scheduler query:
     *   WHERE is_unlocked = false AND unlock_at <= now()
     */
    public function up(): void
    {
        Schema::create('time_capsules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->timestamp('unlock_at');
            $table->boolean('is_unlocked')->default(false);
            $table->timestamp('unlocked_at')->nullable();
            $table->enum('visibility', ['private', 'public', 'friends'])->default('private');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            // Composite index for scheduler unlock queries
            $table->index(['is_unlocked', 'unlock_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_capsules');
    }
};
