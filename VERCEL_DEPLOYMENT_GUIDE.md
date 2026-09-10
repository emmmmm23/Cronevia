# CRONEVIA - Vercel Deployment Guide

## 📋 Deployment Summary

After thorough diagnostic analysis, the deployment issues have been identified and resolved:

### ❌ Original Problems
1. **Wrong Root Directory**: Vercel was pointing to repository root `/` instead of `backend/`
2. **"vite: command not found"**: Dependencies not installed in correct directory
3. **"vue-cli-service: command not found"**: Wrong assumption - project uses Vite, not Vue CLI
4. **Duplicate `</script>` tag**: Syntax error in SettingsPage.vue (FIXED)

### ✅ Solutions Applied
1. ✅ Identified correct project structure (Laravel + Vue integrated in `backend/`)
2. ✅ Confirmed build tool is **Vite** (not Vue CLI)
3. ✅ Fixed Vue syntax error in SettingsPage.vue
4. ✅ **Local build test PASSED**: `npm run build` succeeds
5. ✅ node_modules properly excluded from Git

---

## 🎯 OPTION 1: Deploy Backend (Laravel + Vue) - RECOMMENDED

This deploys the integrated Laravel backend with Vue frontend together.

### Vercel Project Settings

Configure these in your Vercel project dashboard:

```
Framework Preset:        Other
Root Directory:          backend
Build Command:           npm run build
Output Directory:        public/build
Install Command:         npm ci
Node.js Version:         20.x
```

### Environment Variables Required

Add these in Vercel → Settings → Environment Variables:

```env
# Laravel Application
APP_NAME=Cronevia
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://your-domain.vercel.app
APP_TIMEZONE=UTC

# Database (External MySQL Required)
DB_CONNECTION=mysql
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_DATABASE=cronevia
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

# Session & Cache
SESSION_DRIVER=database
CACHE_DRIVER=database
QUEUE_CONNECTION=database

# File Storage (Use S3 for Production)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=cronevia-uploads
AWS_USE_PATH_STYLE_ENDPOINT=false

# Mail (Resend)
MAIL_MAILER=resend
RESEND_API_KEY=your-resend-key

# Sentry (Optional)
SENTRY_LARAVEL_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=1.0
```

### ⚠️ Laravel on Vercel Requirements

**IMPORTANT**: Vercel is a serverless platform. Laravel requires additional configuration:

1. **Create `api/index.php`** - Bootstrap Laravel for serverless:

```php
<?php

// api/index.php
require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
```

2. **Create `vercel.json`** in `backend/`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.php",
      "use": "vercel-php@0.7.0"
    },
    {
      "src": "public/build/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/build/(.*)",
      "dest": "public/build/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.php"
    }
  ],
  "env": {
    "APP_ENV": "production",
    "APP_DEBUG": "false",
    "LOG_CHANNEL": "stderr"
  }
}
```

3. **External MySQL Database Required**:
   - Vercel does NOT provide MySQL
   - Use: PlanetScale, AWS RDS, Railway, or other MySQL hosting
   - Configure `DB_*` environment variables in Vercel

4. **External File Storage Required**:
   - Use AWS S3 for file uploads (photos, media)
   - Configure `AWS_*` environment variables
   - Update `config/filesystems.php` to use `s3` as default

5. **Database Migrations**:
   - Run migrations manually or via deployment script
   - Cannot use `artisan migrate` in production on Vercel
   - Alternative: Use Laravel Vapor, Railway, or traditional hosting

### Build Process

```bash
# What happens during Vercel build:
1. cd backend/
2. npm ci                    # Install Node dependencies
3. npm run build             # Runs: tsc && vite build
   ├─ tsc                    # TypeScript type-checking
   └─ vite build             # Builds Vue assets to public/build/
4. Deploy Laravel + built assets
```

### Verification Steps

After deployment:

1. ✅ Visit `https://your-domain.vercel.app` - should show landing page
2. ✅ Check `/login` - should show login page
3. ✅ Check `/register` - should show registration page
4. ✅ Test API endpoints: `/api/v1/auth/user`
5. ✅ Verify database connectivity
6. ✅ Test file uploads work with S3

---

## 🎯 OPTION 2: Deploy Frontend Only (Vue SPA)

Deploy the standalone Vue SPA from `frontend/` directory.

**Note**: The gitignore indicates this is "legacy" - the primary app is in `backend/`.

### Vercel Project Settings

```
Framework Preset:        Vite
Root Directory:          frontend
Build Command:           npm run build
Output Directory:        dist
Install Command:         npm ci
Node.js Version:         20.x
```

### Environment Variables

```env
VITE_API_BASE_URL=https://your-backend-api.com
```

### Backend Hosting

**IMPORTANT**: If deploying frontend only, you must host the Laravel backend elsewhere:

**Recommended Laravel Hosting**:
- Laravel Forge (AWS/DigitalOcean)
- Laravel Vapor (AWS Serverless)
- Railway
- DigitalOcean App Platform
- Heroku
- Traditional VPS with NGINX + PHP-FPM

**Backend must provide**:
- MySQL database
- File storage
- API endpoints at `/api/v1/*`
- Sanctum authentication endpoints

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [x] Local build test passed (`npm run build` succeeds)
- [x] TypeScript compiles without errors
- [x] Vue components have valid syntax
- [x] node_modules excluded from Git
- [ ] Environment variables prepared
- [ ] External MySQL database provisioned
- [ ] S3 bucket created for file uploads
- [ ] Laravel APP_KEY generated

### Vercel Configuration
- [ ] Root Directory set to `backend/` (or `frontend/`)
- [ ] Build Command: `npm run build`
- [ ] Install Command: `npm ci`
- [ ] Output Directory: `public/build` (backend) or `dist` (frontend)
- [ ] Node.js Version: 20.x
- [ ] All environment variables added

### Laravel Configuration (if deploying backend)
- [ ] Create `api/index.php` bootstrap file
- [ ] Create `vercel.json` configuration
- [ ] Configure database connection
- [ ] Run database migrations
- [ ] Configure S3 storage
- [ ] Test Laravel routes work
- [ ] Verify Sanctum authentication

### Post-Deployment
- [ ] Landing page loads correctly
- [ ] Login/Register pages work
- [ ] API endpoints respond
- [ ] Database queries execute
- [ ] File uploads work (S3)
- [ ] Authentication flow complete
- [ ] Authenticated users see dashboard

---

## 🔍 Troubleshooting

### "vite: command not found"
**Cause**: Wrong Root Directory or dependencies not installed
**Fix**: 
1. Set Root Directory to `backend/` in Vercel settings
2. Ensure Install Command is `npm ci`
3. Verify `package.json` exists in `backend/`

### "vue-cli-service: command not found"
**Cause**: Wrong build tool assumption
**Fix**: Use `npm run build` (not `vue-cli-service build`)

### Build fails with TypeScript errors
**Cause**: TypeScript type-checking fails before Vite runs
**Fix**: 
1. Check build output for specific errors
2. Fix TypeScript issues in `.vue` or `.ts` files
3. Run `npm run build` locally to verify

### "Invalid end tag" error
**Cause**: Duplicate or mismatched HTML tags in Vue components
**Fix**: Check Vue component syntax (already fixed in SettingsPage.vue)

### 404 on Laravel routes
**Cause**: Missing `vercel.json` routing configuration
**Fix**: Create proper `vercel.json` with catch-all route to `api/index.php`

### Database connection fails
**Cause**: Missing or incorrect `DB_*` environment variables
**Fix**: 
1. Verify external MySQL database is accessible
2. Check all `DB_*` variables in Vercel settings
3. Test connection from Laravel

### File uploads fail
**Cause**: Vercel filesystem is read-only (ephemeral)
**Fix**: 
1. Configure S3 storage in `config/filesystems.php`
2. Set `FILESYSTEM_DISK=s3`
3. Add AWS credentials to Vercel environment variables

---

## 📊 Build Verification (Local Test Results)

```bash
$ cd backend
$ npm install
✓ 249 packages installed

$ npm run build
✓ tsc - TypeScript compilation successful
✓ vite build - 148 modules transformed
✓ 35 assets generated in public/build/
✓ Total build time: 3.89s
✓ Gzipped size: ~61.56 kB (main bundle)

BUILD SUCCESSFUL ✅
```

---

## 🎓 Key Learnings

### Project Structure
- **Hybrid architecture**: Backend contains Laravel + Vue (primary)
- **Frontend directory**: Standalone Vue SPA (legacy/secondary)
- **Build tool**: Vite (NOT Vue CLI)
- **TypeScript**: Required for build process

### Build Process
```
npm run build
  ↓
package.json "build" script
  ↓
tsc && vite build
  ↓
1. TypeScript type-checks (noEmit: true)
2. Vite builds and bundles
  ↓
Output: public/build/
```

### Deployment Strategy
- **Option 1**: Full-stack on Vercel (requires serverless Laravel config)
- **Option 2**: Frontend on Vercel + Backend on Laravel hosting (simpler)

---

## 📞 Support

If deployment issues persist:

1. Check Vercel deployment logs for specific errors
2. Verify all environment variables are set correctly
3. Test Laravel backend separately before deploying
4. Consider using Laravel-specific hosting for backend

**Local build works**: ✅ The issue is now purely configuration, not code.

---

## ✅ Success Criteria

Deployment is successful when:

✓ No "vite: command not found" error
✓ No "vue-cli-service: command not found" error  
✓ Build completes without errors
✓ Landing page accessible
✓ Login/Register functional
✓ Dashboard accessible after login
✓ API endpoints respond correctly
✓ Database queries execute
✓ File uploads work (if configured)

**Current Status**: Ready for deployment with proper Vercel configuration.
