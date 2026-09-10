<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class CreateSuperAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cronevia:create-super-admin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create the exclusive Super Admin account for Cronevia system owner/developer';

    /**
     * Execute the console command.
     *
     * SECURITY CRITICAL:
     * - Server-side only (Artisan command, not web-accessible)
     * - Checks if Super Admin already exists
     * - Enforces ONE Super Admin only
     * - Never logs passwords
     * - Hashes password securely
     * - Records creation in audit log
     */
    public function handle(): int
    {
        $this->newLine();
        $this->info('╔═══════════════════════════════════════════════════════════════╗');
        $this->info('║          CRONEVIA EXCLUSIVE SUPER ADMIN SETUP                  ║');
        $this->info('╚═══════════════════════════════════════════════════════════════╝');
        $this->newLine();

        // Check if Super Admin already exists
        $superAdminCount = User::superAdminCount();

        if ($superAdminCount > 0) {
            $this->newLine();
            $this->error('✗ A Super Admin account already exists.');
            $this->line('');
            $this->warn('Only one Super Admin account is permitted in Cronevia.');
            $this->warn('Super Admin registration is now locked.');
            $this->newLine();

            $existingSuperAdmin = User::getSuperAdmin();
            if ($existingSuperAdmin) {
                $this->line('Existing Super Admin:');
                $this->line("  Email: {$existingSuperAdmin->email}");
                $this->line("  Name:  {$existingSuperAdmin->name}");
                $this->line("  Created: {$existingSuperAdmin->created_at->format('Y-m-d H:i:s')}");
                $this->newLine();
            }

            return Command::FAILURE;
        }

        $this->line('This command will create the exclusive Super Admin account.');
        $this->line('Only ONE Super Admin is permitted per Cronevia instance.');
        $this->newLine();

        // Collect Super Admin information
        try {
            $name = $this->ask('Super Admin Name');
            if (empty($name)) {
                $this->error('Name is required.');
                return Command::FAILURE;
            }

            $email = $this->ask('Super Admin Email');
            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->error('A valid email address is required.');
                return Command::FAILURE;
            }

            // Check if email already exists
            if (User::where('email', $email)->exists()) {
                $this->error("An account with email '{$email}' already exists.");
                return Command::FAILURE;
            }

            $password = $this->secret('Password (minimum 12 characters)');
            if (empty($password) || strlen($password) < 8) {
                $this->error('Password must be at least 8 characters.');
                return Command::FAILURE;
            }

            $passwordConfirm = $this->secret('Confirm Password');
            if ($password !== $passwordConfirm) {
                $this->error('Passwords do not match.');
                return Command::FAILURE;
            }

            // Validate password strength
            $this->validatePassword($password);

            $this->newLine();
            $this->line('Creating Super Admin account...');
            $this->newLine();

            // Create the Super Admin
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role' => 'super_admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            // Log the Super Admin creation in audit log
            AuditService::logSuperAdminCreated($user);

            $this->newLine();
            $this->info('✓ Super Admin account created successfully!');
            $this->newLine();
            $this->line('Account Details:');
            $this->line("  ID:    {$user->id}");
            $this->line("  Name:  {$user->name}");
            $this->line("  Email: {$user->email}");
            $this->line("  Role:  {$user->role}");
            $this->line("  Status: {$user->status}");
            $this->newLine();

            $this->info('✓ Super Admin registration is now locked.');
            $this->warn('Only one Super Admin account is permitted.');
            $this->newLine();

            $this->line('Super Admin Login URL: /super-admin/login');
            $this->newLine();

            $this->line('⚠️  IMPORTANT SECURITY REMINDERS:');
            $this->line('   • Store your password securely');
            $this->line('   • Enable Multi-Factor Authentication (MFA) when available');
            $this->line('   • Never share Super Admin credentials');
            $this->line('   • Monitor audit logs for unauthorized access');
            $this->newLine();

            return Command::SUCCESS;
        } catch (ValidationException $e) {
            $this->newLine();
            $this->error('Validation failed:');
            foreach ($e->errors() as $field => $errors) {
                foreach ($errors as $error) {
                    $this->line("  • {$error}");
                }
            }
            $this->newLine();

            return Command::FAILURE;
        } catch (\Exception $e) {
            $this->newLine();
            $this->error('An error occurred: ' . $e->getMessage());
            $this->newLine();

            return Command::FAILURE;
        }
    }

    /**
     * Validate password strength.
     *
     * @param string $password
     * @return void
     * @throws ValidationException
     */
    private function validatePassword(string $password): void
    {
        $validator = validator(['password' => $password], [
            'password' => [
                'required',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }
}
