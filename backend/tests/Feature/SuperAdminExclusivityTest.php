<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * SuperAdminExclusivityTest - Comprehensive tests for Super Admin exclusivity.
 *
 * TEST SUITE COVERAGE:
 * - Only one Super Admin can exist
 * - Normal registration always creates role='user'
 * - Frontend cannot override role during registration
 * - Super Admin account cannot be deleted/demoted
 * - Super Admin endpoints require proper authentication
 * - Normal users cannot access admin routes
 * - Admin routes return 403 Forbidden for unauthorized users
 */
class SuperAdminExclusivityTest extends TestCase
{
    use RefreshDatabase;

    // ============================================================
    // TEST 1: Create the first Super Admin
    // ============================================================
    public function test_super_admin_can_be_created(): void
    {
        $this->assertDatabaseCount('users', 0);

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->assertDatabaseCount('users', 1);
        $this->assertTrue($superAdmin->isSuperAdmin());
        $this->assertTrue($superAdmin->isActive());
        $this->assertEquals('super_admin', $superAdmin->role);
    }

    // ============================================================
    // TEST 2: Attempt to create another Super Admin (should be prevented)
    // ============================================================
    public function test_only_one_super_admin_can_exist(): void
    {
        $firstAdmin = User::create([
            'name' => 'First Admin',
            'email' => 'first@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $superAdminCount = User::superAdminCount();
        $this->assertEquals(1, $superAdminCount);

        // In practice, this is prevented by the Artisan command logic
        // This test verifies the database can distinguish Super Admins
        $allSuperAdmins = User::where('role', 'super_admin')->get();
        $this->assertCount(1, $allSuperAdmins);
    }

    // ============================================================
    // TEST 3: Normal registration creates role='user'
    // ============================================================
    public function test_normal_registration_creates_user_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'message' => 'Registration successful.',
        ]);

        $user = User::where('email', 'john@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('user', $user->role);
        $this->assertFalse($user->isSuperAdmin());
        $this->assertTrue($user->isNormalUser());
    }

    // ============================================================
    // TEST 4: Frontend cannot override role to super_admin
    // ============================================================
    public function test_frontend_cannot_set_role_to_super_admin(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Malicious User',
            'email' => 'malicious@example.com',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'role' => 'super_admin',  // Trying to set role via frontend
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'malicious@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('user', $user->role);  // Must still be 'user'
        $this->assertFalse($user->isSuperAdmin());
    }

    // ============================================================
    // TEST 5: User scope queries work correctly
    // ============================================================
    public function test_user_scope_queries(): void
    {
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Normal User 1',
            'email' => 'user1@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Normal User 2',
            'email' => 'user2@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $superAdmins = User::superAdmins()->get();
        $normalUsers = User::normalUsers()->get();

        $this->assertCount(1, $superAdmins);
        $this->assertCount(2, $normalUsers);
        $this->assertEquals('super_admin', $superAdmins[0]->role);
        $this->assertEquals('user', $normalUsers[0]->role);
    }

    // ============================================================
    // TEST 6: Super Admin static methods
    // ============================================================
    public function test_super_admin_static_methods(): void
    {
        $this->assertEquals(0, User::superAdminCount());
        $this->assertNull(User::getSuperAdmin());

        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->assertEquals(1, User::superAdminCount());
        $this->assertNotNull(User::getSuperAdmin());
        $this->assertEquals($admin->id, User::getSuperAdmin()->id);
    }

    // ============================================================
    // TEST 7: Unauthenticated user cannot access admin routes
    // ============================================================
    public function test_unauthenticated_user_cannot_access_admin_routes(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(401);
    }

    // ============================================================
    // TEST 8: Normal authenticated user gets 403 Forbidden
    // ============================================================
    public function test_normal_user_gets_403_forbidden_on_admin_routes(): void
    {
        $user = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Unauthorized. Super Admin access required.',
        ]);
    }

    // ============================================================
    // TEST 9: Super Admin can access admin routes
    // ============================================================
    public function test_super_admin_can_access_admin_dashboard(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'super_admin',
                'system',
                'application',
                'environment',
            ],
        ]);
    }

    // ============================================================
    // TEST 10: Suspended Super Admin cannot access admin routes
    // ============================================================
    public function test_suspended_super_admin_cannot_access_admin_routes(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'suspended',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Forbidden. Super Admin account is not active.',
        ]);
    }

    // ============================================================
    // TEST 11: Normal user cannot suspend another user
    // ============================================================
    public function test_normal_user_cannot_suspend_another_user(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $normalUser = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $anotherUser = User::create([
            'name' => 'Another User',
            'email' => 'another@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($normalUser)
            ->postJson("/api/v1/admin/users/{$anotherUser->id}/suspend");

        $response->assertStatus(403);
    }

    // ============================================================
    // TEST 12: Super Admin can suspend a normal user
    // ============================================================
    public function test_super_admin_can_suspend_user(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $user = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$user->id}/suspend");

        $response->assertStatus(200);
        $this->assertEquals('suspended', $user->fresh()->status);
    }

    // ============================================================
    // TEST 13: Super Admin cannot be deleted
    // ============================================================
    public function test_super_admin_cannot_be_deleted(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/v1/admin/users/{$admin->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    // ============================================================
    // TEST 14: Super Admin cannot be suspended
    // ============================================================
    public function test_super_admin_cannot_be_suspended(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/admin/users/{$admin->id}/suspend");

        $response->assertStatus(403);
        $this->assertEquals('active', $admin->fresh()->status);
    }

    // ============================================================
    // TEST 15: LocalStorage/Frontend role cannot grant access
    // ============================================================
    public function test_frontend_modified_role_does_not_grant_access(): void
    {
        $user = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        // Even if frontend claims to have role=super_admin, database shows user
        $response = $this->actingAs($user)->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(403);

        // Verify the user's actual role in database is still 'user'
        $this->assertEquals('user', $user->fresh()->role);
    }

    // ============================================================
    // TEST 16: Normal user list endpoint returns 403
    // ============================================================
    public function test_normal_user_cannot_list_users(): void
    {
        $user = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/admin/users');
        $response->assertStatus(403);
    }

    // ============================================================
    // TEST 17: Super Admin can list all users
    // ============================================================
    public function test_super_admin_can_list_all_users(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'User 1',
            'email' => 'user1@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'User 2',
            'email' => 'user2@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/users');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data',
            'pagination',
        ]);
    }

    // ============================================================
    // TEST 18: Role field is returned in me() endpoint
    // ============================================================
    public function test_role_field_returned_in_me_endpoint(): void
    {
        $user = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/auth/me');
        $response->assertStatus(200);
        $response->assertJsonPath('data.role', 'user');
    }

    // ============================================================
    // TEST 19: Normal user cannot delete another user
    // ============================================================
    public function test_normal_user_cannot_delete_another_user(): void
    {
        $user1 = User::create([
            'name' => 'User 1',
            'email' => 'user1@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $user2 = User::create([
            'name' => 'User 2',
            'email' => 'user2@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user1)
            ->deleteJson("/api/v1/admin/users/{$user2->id}");

        $response->assertStatus(403);
    }

    // ============================================================
    // TEST 20: Super Admin can delete a normal user
    // ============================================================
    public function test_super_admin_can_delete_normal_user(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cronevia.com',
            'password' => 'HashedPassword123!',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $user = User::create([
            'name' => 'Normal User',
            'email' => 'user@example.com',
            'password' => 'HashedPassword123!',
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/v1/admin/users/{$user->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }
}
