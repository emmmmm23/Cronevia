# Cronevia Super Admin Setup Wizard
# This script guides you through creating your exclusive Super Admin account

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     CRONEVIA EXCLUSIVE SUPER ADMIN SETUP WIZARD               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Collect user information
Write-Host "📋 SUPER ADMIN ACCOUNT SETUP" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$name = Read-Host "👤 Enter your full name"
Write-Host ""

$email = Read-Host "📧 Enter your email address"
Write-Host ""

Write-Host "🔐 PASSWORD REQUIREMENTS:" -ForegroundColor Yellow
Write-Host "   • 8+ characters (12+ recommended)"
Write-Host "   • Uppercase letters (A-Z)"
Write-Host "   • Lowercase letters (a-z)"
Write-Host "   • Numbers (0-9)"
Write-Host "   • Symbols (!@#$%^&*)"
Write-Host ""

$password = Read-Host "🔑 Enter a strong password" -AsSecureString
$passwordConfirm = Read-Host "🔑 Confirm password" -AsSecureString

# Convert to plain text for comparison
$pass1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($password))
$pass2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($passwordConfirm))

if ($pass1 -ne $pass2) {
    Write-Host "❌ Passwords do not match. Setup cancelled." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 REVIEW YOUR INFORMATION:" -ForegroundColor Cyan
Write-Host "   Name:  $name"
Write-Host "   Email: $email"
Write-Host ""

$confirm = Read-Host "✅ Is this correct? (yes/no)"

if ($confirm -ne "yes" -and $confirm -ne "y") {
    Write-Host "❌ Setup cancelled." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Creating your Super Admin account..." -ForegroundColor Cyan
Write-Host ""

# Create a temporary input file for the command
$inputFile = New-TemporaryFile
Add-Content -Path $inputFile -Value "$name"
Add-Content -Path $inputFile -Value "$email"
Add-Content -Path $inputFile -Value "$pass1"
Add-Content -Path $inputFile -Value "$pass1"

# Run the command with piped input
Get-Content $inputFile | php artisan cronevia:create-super-admin

# Clean up
Remove-Item -Path $inputFile -Force

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Your exclusive Super Admin account has been created." -ForegroundColor Green
Write-Host ""
Write-Host "📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Store your password securely in a password manager"
Write-Host "   2. Never share these credentials"
Write-Host "   3. Monitor audit logs for security events"
Write-Host "   4. Enable HTTPS in production"
Write-Host ""
Write-Host "🧪 TO VERIFY:" -ForegroundColor Cyan
Write-Host "   php artisan test"
Write-Host ""
Write-Host "💻 LOGIN TO ADMIN DASHBOARD:" -ForegroundColor Cyan
Write-Host "   POST /api/v1/auth/login"
Write-Host "   GET  /api/v1/admin/dashboard"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
