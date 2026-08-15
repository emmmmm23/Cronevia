<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The `content` column is plain text — encryption is handled at the Eloquent
     * model layer via the `encrypted` cast on FutureLetter::$casts.
     *
     * Composite index on (is_delivered, deliver_at) supports the Scheduler query:
     *   WHERE is_delivered = false AND deliver_at <= now() AND deleted_at IS NULL
     */
    public function up(): void
    {
        Schema::create('future_letters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('recipient_email');
            $table->string('subject', 255);
            $table->text('content');  // Encrypted at rest via Eloquent 'encrypted' cast
            $table->timestamp('deliver_at');
            $table->boolean('is_delivered')->default(false);
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            // Composite index for scheduler delivery queries
            $table->index(['is_delivered', 'deliver_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('future_letters');
    }
};
