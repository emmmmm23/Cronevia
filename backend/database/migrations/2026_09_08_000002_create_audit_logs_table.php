<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates audit_logs table for tracking security-critical events:
     * - Super Admin creation/replacement
     * - Super Admin login attempts
     * - User suspension/deletion
     * - Role changes
     * - Other administrative actions
     *
     * SECURITY: Does NOT store passwords or sensitive data.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_type', 100);  // e.g., 'super_admin_created', 'super_admin_login', 'user_suspended'
            $table->uuid('user_id')->nullable()->index();  // The user performing the action (if applicable)
            $table->uuid('target_user_id')->nullable();  // The user being affected (if applicable)
            $table->string('ip_address', 45)->nullable();  // IPv4 or IPv6
            $table->text('user_agent')->nullable();
            $table->json('data')->nullable();  // Additional context (not passwords)
            $table->string('environment', 50)->nullable();  // 'local', 'staging', 'production'
            $table->timestamps();

            // Indexes for common queries
            $table->index('event_type');
            $table->index(['user_id', 'created_at']);
            $table->index(['target_user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
