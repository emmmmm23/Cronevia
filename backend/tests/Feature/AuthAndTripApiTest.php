<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndTripApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_fetch_current_user(): void
    {
        $payload = [
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', 'ada@example.com');

        $user = User::first();

        $this->actingAs($user)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.email', 'ada@example.com');
    }

    public function test_invalid_credentials_return_401_without_setting_a_session_cookie(): void
    {
        User::factory()->create([
            'email' => 'person@example.com',
            'password' => 'correct-password',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'person@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
        $this->assertEmpty($response->headers->getCookies());
    }

    public function test_authenticated_user_can_list_own_trips(): void
    {
        $user = User::factory()->create();
        Trip::factory()->count(2)->create(['user_id' => $user->id]);
        Trip::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/v1/trips');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 2);
    }
}
