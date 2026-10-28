<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_session_of_a_suspended_account_cannot_read_or_write_content(): void
    {
        $user = User::factory()->create(['status' => 'suspended']);
        $this->actingAs($user)->getJson('/api/v1/trips')->assertForbidden();
        $this->postJson('/api/v1/trips', ['title' => 'Blocked trip'])->assertForbidden();
        $this->getJson('/api/v1/auth/me')->assertForbidden();
        $this->assertDatabaseCount('trips', 0);
    }

    public function test_credentialed_cors_is_limited_to_the_configured_origin(): void
    {
        config(['cors.allowed_origins' => ['https://cronevia.vercel.app']]);
        $user = User::factory()->create(['status' => 'active']);
        $this->actingAs($user)->withHeader('Origin', 'https://untrusted.example')
            ->getJson('/api/v1/auth/me')->assertHeaderMissing('Access-Control-Allow-Origin');
    }

    public function test_profile_email_change_cannot_bypass_password_confirmation(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $original = $user->email;
        $this->actingAs($user)->patchJson('/api/v1/auth/profile', ['email' => 'different@example.test'])
            ->assertUnprocessable();
        $this->assertSame($original, $user->fresh()->email);
    }
}
