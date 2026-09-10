<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add journal_entry_id to media table to support photo attachments
 * in journal entries. Media can belong to either a memory or journal entry.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            if (!Schema::hasColumn('media', 'journal_entry_id')) {
                // Add after memory_id to keep related fields together
                $table->uuid('journal_entry_id')->nullable()->after('memory_id');
                $table->foreign('journal_entry_id')
                      ->references('id')
                      ->on('journal_entries')
                      ->nullOnDelete();
                $table->index('journal_entry_id');
            }
        });

        // Make memory_id nullable if it isn't already
        Schema::table('media', function (Blueprint $table) {
            $table->uuid('memory_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropForeign(['journal_entry_id']);
            $table->dropIndex(['journal_entry_id']);
            $table->dropColumn('journal_entry_id');
        });
    }
};
