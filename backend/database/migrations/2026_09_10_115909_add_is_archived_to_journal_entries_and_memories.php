<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add is_archived column to journal_entries and memories tables
 * to support archiving functionality without deleting content.
 * 
 * Archived entries:
 * - Remain in the database
 * - Do not appear in default listings
 * - Are accessible through dedicated "Archive" sections
 * - Can be restored at any time
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add is_archived to journal_entries
        Schema::table('journal_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('journal_entries', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('visibility');
                $table->index('is_archived');
            }
        });

        // Add is_archived to memories
        Schema::table('memories', function (Blueprint $table) {
            if (!Schema::hasColumn('memories', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('visibility');
                $table->index('is_archived');
            }
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropIndex(['is_archived']);
            $table->dropColumn('is_archived');
        });

        Schema::table('memories', function (Blueprint $table) {
            $table->dropIndex(['is_archived']);
            $table->dropColumn('is_archived');
        });
    }
};
