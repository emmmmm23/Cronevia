# Cronevia Vercel Deployment Script
# This script helps you deploy to Vercel with all necessary checks

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  Cronevia Vercel Deployment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "frontend/package.json")) {
    Write-Host "❌ Error: Must be run from project root (Cronevia/)" -ForegroundColor Red
    exit 1
}

# Check if Vercel CLI is installed
Write-Host "🔍 Checking Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Run: npm install -g vercel" -ForegroundColor Yellow
    $install = Read-Host "Install now? (y/n)"
    if ($install -eq "y") {
        npm install -g vercel
    } else {
        exit 1
    }
}

Write-Host ""

# Test local build
Write-Host "🔨 Testing local build..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm run build 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Local build successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Local build failed. Fix errors before deploying." -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "❌ Build error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""

# Check environment variables
Write-Host "🔐 Environment Variables Checklist:" -ForegroundColor Yellow
Write-Host "   Required in Vercel Dashboard:" -ForegroundColor Cyan
Write-Host "   - VITE_SUPABASE_URL" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host ""
$envConfirm = Read-Host "Have you set these in Vercel Dashboard? (y/n)"
if ($envConfirm -ne "y") {
    Write-Host "⚠️  Please set environment variables first:" -ForegroundColor Yellow
    Write-Host "   1. Go to https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "   2. Select your project" -ForegroundColor White
    Write-Host "   3. Settings > Environment Variables" -ForegroundColor White
    Write-Host "   4. Add the required variables" -ForegroundColor White
    exit 0
}

Write-Host ""

# Deploy
Write-Host "🚀 Ready to deploy!" -ForegroundColor Green
Write-Host ""
$deployType = Read-Host "Deploy to (1) Preview or (2) Production? (1/2)"

if ($deployType -eq "1") {
    Write-Host "🌐 Deploying to Preview..." -ForegroundColor Cyan
    vercel
} elseif ($deployType -eq "2") {
    Write-Host "🌐 Deploying to Production..." -ForegroundColor Cyan
    vercel --prod
} else {
    Write-Host "❌ Invalid selection" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Post-Deployment Checklist:" -ForegroundColor Yellow
Write-Host "   [ ] Visit deployment URL" -ForegroundColor White
Write-Host "   [ ] Test authentication" -ForegroundColor White
Write-Host "   [ ] Verify Supabase connection" -ForegroundColor White
Write-Host "   [ ] Check browser console for errors" -ForegroundColor White
Write-Host ""
