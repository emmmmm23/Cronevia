<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds the 'role' column to users table for role-based access control.
     * Supports 'user' and 'super_admin' roles.
     *
     * SECURITY: Normal registration always assigns role = 'user'
     * Super Admin provisioning is server-side only via Artisan command.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add role column with enum type and default to 'user'
            $table->enum('role', ['user', 'super_admin'])
                ->default('user')
                ->after('status')
                ->comment('User role: user (normal user) or super_admin (exclusive system owner)');
        });

        // Optional: Add index for role queries
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }
};
