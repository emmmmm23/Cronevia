<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ReplaceSuperAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cronevia:replace-super-admin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Replace the existing Super Admin account with a new one (requires confirmation)';

    /**
     * Execute the console command.
     *
     * SECURITY CRITICAL:
     * - Server-side only (Artisan command, not web-accessible)
     * - Requires explicit confirmation (double confirmation)
     * - Disables old Super Admin account (soft-delete or suspended)
     * - Creates new Super Admin
     * - Maintains audit trail
     * - Never logs passwords
     * - Ensures only ONE active Super Admin exists
     */
    public function handle(): int
    {
        $this->newLine();
        $this->info('╔═══════════════════════════════════════════════════════════════╗');
        $this->info('║       CRONEVIA REPLACE SUPER ADMIN (REQUIRES CONFIRMATION)     ║');
        $this->info('╚═══════════════════════════════════════════════════════════════╝');
        $this->newLine();

        // Check if Super Admin exists
        $currentSuperAdmin = User::getSuperAdmin();

        if (!$currentSuperAdmin) {
            $this->newLine();
            $this->error('✗ No Super Admin account found.');
            $this->line('');
            $this->info('Use "php artisan cronevia:create-super-admin" to create the first Super Admin.');
            $this->newLine();

            return Command::FAILURE;
        }

        $this->line('Current Super Admin:');
        $this->line("  Email: {$currentSuperAdmin->email}");
        $this->line("  Name:  {$currentSuperAdmin->name}");
        $this->line("  Created: {$currentSuperAdmin->created_at->format('Y-m-d H:i:s')}");
        $this->newLine();

        // First confirmation
        $this->warn('⚠️  WARNING: This operation will replace the Super Admin account.');
        $this->warn('   The current Super Admin will be suspended and cannot be undone.');
        $this->newLine();

        $confirm1 = $this->confirm('Are you sure you want to continue?', false);
        if (!$confirm1) {
            $this->line('Operation cancelled.');
            $this->newLine();
            return Command::FAILURE;
        }

        // Second confirmation (double confirmation for critical operation)
        $this->newLine();
        $this->error('⚠️  FINAL WARNING: This is a critical operation.');
        $this->line('Type "REPLACE SUPER ADMIN" (exactly) to confirm:');
        $confirmation = $this->ask('Confirmation');

        if ($confirmation !== 'REPLACE SUPER ADMIN') {
            $this->line('Operation cancelled. Confirmation text did not match.');
            $this->newLine();
            return Command::FAILURE;
        }

        $this->newLine();
        $this->line('Proceeding with Super Admin replacement...');
        $this->newLine();

        try {
            // Collect new Super Admin information
            $name = $this->ask('New Super Admin Name');
            if (empty($name)) {
                $this->error('Name is required.');
                return Command::FAILURE;
            }

            $email = $this->ask('New Super Admin Email');
            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->error('A valid email address is required.');
                return Command::FAILURE;
            }

            // Check if email already exists (excluding current super admin)
            if (User::where('email', $email)->where('id', '!=', $currentSuperAdmin->id)->exists()) {
                $this->error("An account with email '{$email}' already exists.");
                return Command::FAILURE;
            }

            $password = $this->secret('New Password (minimum 8 characters)');
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
            $this->line('Suspending old Super Admin account...');

            // Suspend the current Super Admin (soft delete is optional, suspension is more transparent)
            $currentSuperAdmin->update([
                'status' => 'suspended',
            ]);

            $this->line('Old Super Admin account has been suspended.');
            $this->newLine();
            $this->line('Creating new Super Admin account...');
            $this->newLine();

            // Create the new Super Admin
            $newSuperAdmin = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role' => 'super_admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            // Log the Super Admin replacement in audit log
            AuditService::logSuperAdminReplaced($currentSuperAdmin, $newSuperAdmin);

            $this->newLine();
            $this->info('✓ Super Admin account replaced successfully!');
            $this->newLine();

            $this->line('Old Super Admin (Suspended):');
            $this->line("  Email:  {$currentSuperAdmin->email}");
            $this->line("  Name:   {$currentSuperAdmin->name}");
            $this->line("  Status: Suspended");
            $this->newLine();

            $this->line('New Super Admin (Active):');
            $this->line("  ID:    {$newSuperAdmin->id}");
            $this->line("  Email: {$newSuperAdmin->email}");
            $this->line("  Name:  {$newSuperAdmin->name}");
            $this->line("  Role:  {$newSuperAdmin->role}");
            $this->line("  Status: {$newSuperAdmin->status}");
            $this->newLine();

            $this->line('Super Admin Login URL: /super-admin/login');
            $this->newLine();

            $this->line('⚠️  IMPORTANT SECURITY REMINDERS:');
            $this->line('   • Store your new password securely');
            $this->line('   • The old Super Admin account has been SUSPENDED');
            $this->line('   • Only one active Super Admin is permitted');
            $this->line('   • Enable Multi-Factor Authentication (MFA) when available');
            $this->line('   • Monitor audit logs for all administrative changes');
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
