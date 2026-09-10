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
        Schema::table('media', function (Blueprint $table) {
            // Make memory_id nullable to support profile photos
            $table->uuid('memory_id')->nullable()->change();
            
            // Add is_cover_photo flag (used for trips)
            if (!Schema::hasColumn('media', 'is_cover_photo')) {
                $table->boolean('is_cover_photo')->default(false)->after('sort_order');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            if (Schema::hasColumn('media', 'is_cover_photo')) {
                $table->dropColumn('is_cover_photo');
            }
            
            // Note: Reversing nullable change requires data considerations
            // $table->uuid('memory_id')->nullable(false)->change();
        });
    }
};
