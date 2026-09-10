<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * SuperAdminCommandTest - Tests for Artisan commands.
 *
 * TEST COVERAGE:
 * - create-super-admin command creates first Super Admin
 * - create-super-admin prevents creating second Super Admin
 * - create-super-admin validates passwords
 * - replace-super-admin replaces existing Super Admin
 * - replace-super-admin requires confirmation
 * - Audit logs are created for all operations
 */
class SuperAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    // ============================================================
    // TEST 1: Create Super Admin command succeeds
    // ============================================================
    public function test_create_super_admin_command_succeeds(): void
    {
        $this->artisan('cronevia:create-super-admin')
            ->expectsQuestion('Super Admin Name', 'Juan Miguel')
            ->expectsQuestion('Super Admin Email', 'juan@cronevia.com')
            ->expectsQuestion('Password (minimum 12 characters)', 'SecurePass123!')
            ->expectsQuestion('Confirm Password', 'SecurePass123!')
            ->assertExitCode(0);

        $admin = User::where('email', 'juan@cronevia.com')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->isSuperAdmin());
        $this->assertTrue($admin->isActive());
    }

    // ============================================================
    // TEST 2: Create Super Admin command fails if one exists
    // ============================================================
    public function test_create_super_admin_command_fails_if_exists(): void
    {
        User::create([
            'name' => 'Existing Admin',
            'email' => 'existing@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->artisan('cronevia:create-super-admin')
            ->expectsQuestion('Super Admin Name', 'Juan Miguel')
            ->expectsQuestion('Super Admin Email', 'juan@cronevia.com')
            ->expectsQuestion('Password (minimum 12 characters)', 'SecurePass123!')
            ->expectsQuestion('Confirm Password', 'SecurePass123!')
            ->assertExitCode(1);

        $count = User::superAdminCount();
        $this->assertEquals(1, $count);
    }

    // ============================================================
    // TEST 3: Create Super Admin logs to audit log
    // ============================================================
    public function test_create_super_admin_creates_audit_log(): void
    {
        $this->artisan('cronevia:create-super-admin')
            ->expectsQuestion('Super Admin Name', 'Juan Miguel')
            ->expectsQuestion('Super Admin Email', 'juan@cronevia.com')
            ->expectsQuestion('Password (minimum 12 characters)', 'SecurePass123!')
            ->expectsQuestion('Confirm Password', 'SecurePass123!')
            ->assertExitCode(0);

        $admin = User::where('email', 'juan@cronevia.com')->first();

        $auditLog = AuditLog::where('event_type', 'super_admin_created')
            ->where('target_user_id', $admin->id)
            ->first();

        $this->assertNotNull($auditLog);
        $this->assertEquals('super_admin_created', $auditLog->event_type);
    }

    // ============================================================
    // TEST 4: Replace Super Admin command succeeds
    // ============================================================
    public function test_replace_super_admin_command_succeeds(): void
    {
        User::create([
            'name' => 'Old Admin',
            'email' => 'old@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->artisan('cronevia:replace-super-admin')
            ->expectsConfirmation('Are you sure you want to continue?', 'yes')
            ->expectsQuestion('Confirmation', 'REPLACE SUPER ADMIN')
            ->expectsQuestion('New Super Admin Name', 'New Admin')
            ->expectsQuestion('New Super Admin Email', 'new@cronevia.com')
            ->expectsQuestion('New Password (minimum 8 characters)', 'NewPass123!')
            ->expectsQuestion('Confirm Password', 'NewPass123!')
            ->assertExitCode(0);

        $oldAdmin = User::where('email', 'old@cronevia.com')->first();
        $newAdmin = User::where('email', 'new@cronevia.com')->first();

        $this->assertEquals('suspended', $oldAdmin->status);
        $this->assertTrue($newAdmin->isSuperAdmin());
        $this->assertTrue($newAdmin->isActive());
    }

    // ============================================================
    // TEST 5: Replace Super Admin fails if no admin exists
    // ============================================================
    public function test_replace_super_admin_fails_if_no_admin_exists(): void
    {
        $this->artisan('cronevia:replace-super-admin')
            ->assertExitCode(1);
    }

    // ============================================================
    // TEST 6: Replace Super Admin requires confirmation
    // ============================================================
    public function test_replace_super_admin_requires_confirmation(): void
    {
        User::create([
            'name' => 'Old Admin',
            'email' => 'old@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->artisan('cronevia:replace-super-admin')
            ->expectsConfirmation('Are you sure you want to continue?', 'no')
            ->assertExitCode(1);

        $oldAdmin = User::where('email', 'old@cronevia.com')->first();
        $this->assertEquals('active', $oldAdmin->status);
    }

    // ============================================================
    // TEST 7: Replace Super Admin requires exact confirmation text
    // ============================================================
    public function test_replace_super_admin_requires_exact_confirmation(): void
    {
        User::create([
            'name' => 'Old Admin',
            'email' => 'old@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->artisan('cronevia:replace-super-admin')
            ->expectsConfirmation('Are you sure you want to continue?', 'yes')
            ->expectsQuestion('Confirmation', 'wrong text')
            ->assertExitCode(1);

        $oldAdmin = User::where('email', 'old@cronevia.com')->first();
        $this->assertEquals('active', $oldAdmin->status);
    }

    // ============================================================
    // TEST 8: Replace Super Admin logs to audit log
    // ============================================================
    public function test_replace_super_admin_creates_audit_log(): void
    {
        User::create([
            'name' => 'Old Admin',
            'email' => 'old@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->artisan('cronevia:replace-super-admin')
            ->expectsConfirmation('Are you sure you want to continue?', 'yes')
            ->expectsQuestion('Confirmation', 'REPLACE SUPER ADMIN')
            ->expectsQuestion('New Super Admin Name', 'New Admin')
            ->expectsQuestion('New Super Admin Email', 'new@cronevia.com')
            ->expectsQuestion('New Password (minimum 8 characters)', 'NewPass123!')
            ->expectsQuestion('Confirm Password', 'NewPass123!')
            ->assertExitCode(0);

        $auditLog = AuditLog::where('event_type', 'super_admin_replaced')->first();
        $this->assertNotNull($auditLog);
    }

    // ============================================================
    // TEST 9: Only one Super Admin exists after replacement
    // ============================================================
    public function test_only_one_super_admin_after_replacement(): void
    {
        User::create([
            'name' => 'Old Admin',
            'email' => 'old@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->artisan('cronevia:replace-super-admin')
            ->expectsConfirmation('Are you sure you want to continue?', 'yes')
            ->expectsQuestion('Confirmation', 'REPLACE SUPER ADMIN')
            ->expectsQuestion('New Super Admin Name', 'New Admin')
            ->expectsQuestion('New Super Admin Email', 'new@cronevia.com')
            ->expectsQuestion('New Password (minimum 8 characters)', 'NewPass123!')
            ->expectsQuestion('Confirm Password', 'NewPass123!')
            ->assertExitCode(0);

        $activeSuperAdmins = User::where('role', 'super_admin')
            ->where('status', 'active')
            ->get();

        $this->assertCount(1, $activeSuperAdmins);
    }

    // ============================================================
    // TEST 10: Create Super Admin validates password
    // ============================================================
    public function test_create_super_admin_validates_weak_password(): void
    {
        $this->artisan('cronevia:create-super-admin')
            ->expectsQuestion('Super Admin Name', 'Juan Miguel')
            ->expectsQuestion('Super Admin Email', 'juan@cronevia.com')
            ->expectsQuestion('Password (minimum 12 characters)', 'weak')
            ->assertExitCode(1);
    }
}
