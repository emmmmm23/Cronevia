# 🚀 Deploy CRONEVIA to Vercel - Quick Start

## ✅ Problems Fixed

1. ✅ **"vite: command not found"** - Fixed by setting correct Root Directory
2. ✅ **"vue-cli-service: command not found"** - Fixed (project uses Vite, not Vue CLI)
3. ✅ **Duplicate `</script>` tag** - Fixed in SettingsPage.vue
4. ✅ **Local build test** - PASSED ✓

---

## 🎯 Vercel Configuration

### Step 1: Vercel Project Settings

Go to your Vercel project → **Settings** → **General**

```
Framework Preset:     Other
Root Directory:       backend
Build Command:        npm run build
Output Directory:     public/build
Install Command:      npm ci
Node.js Version:      20.x
```

### Step 2: Add Environment Variables

Go to **Settings** → **Environment Variables**

**Required:**
```env
APP_KEY=base64:YOUR_GENERATED_KEY_HERE
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.vercel.app

# External MySQL Database
DB_CONNECTION=mysql
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_DATABASE=cronevia
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password

# Session & Cache (use database for serverless)
SESSION_DRIVER=database
CACHE_DRIVER=database

# File Storage (must use S3 in production)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=cronevia-uploads
```

**Optional:**
```env
RESEND_API_KEY=your-resend-key
SENTRY_LARAVEL_DSN=your-sentry-dsn
```

### Step 3: Generate APP_KEY

Run locally in backend directory:
```bash
php artisan key:generate --show
```

Copy the output and add it to Vercel environment variables.

### Step 4: Setup External Database

**Vercel does NOT provide MySQL.** You need to use an external database:

**Options:**
- [PlanetScale](https://planetscale.com/) - Free tier available
- [Railway](https://railway.app/) - Easy MySQL setup
- [AWS RDS](https://aws.amazon.com/rds/) - Production-grade
- [DigitalOcean Managed Database](https://www.digitalocean.com/products/managed-databases)

Once created, add the connection details to Vercel environment variables.

### Step 5: Setup S3 Storage (for file uploads)

Vercel's filesystem is ephemeral - files uploaded will disappear after deployment.

**You MUST use S3 for production:**

1. Create an S3 bucket on AWS
2. Create IAM user with S3 access
3. Add credentials to Vercel environment variables
4. Already configured in `config/filesystems.php`

### Step 6: Deploy

```bash
# Commit the fixes
git add backend/resources/js/pages/SettingsPage.vue
git add backend/vercel.json
git add backend/api/index.php
git commit -m "fix: resolve Vue syntax error and add Vercel configuration"
git push
```

Vercel will automatically deploy on push.

---

## ⚠️ Important Notes

### Laravel on Vercel Limitations

Vercel is a **serverless platform** - it has limitations for traditional frameworks:

1. **No persistent filesystem** - use S3 for uploads ✓
2. **No background jobs** - use external queue service if needed
3. **Cold starts** - first request may be slower
4. **Function timeout** - 10 seconds on free tier, 300s on pro

### Alternative: Split Deployment

**If Laravel on Vercel is too complex**, consider:

1. **Frontend** → Vercel (static)
   - Deploy from `frontend/` directory
   - Build Command: `npm run build`
   - Output: `dist/`

2. **Backend** → Laravel-friendly hosting
   - [Laravel Forge](https://forge.laravel.com/) + AWS/DigitalOcean
   - [Railway](https://railway.app/)
   - [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
   - Traditional VPS

This approach is **simpler and more reliable** for Laravel.

---

## ✅ Verification

After deployment, test:

1. Visit `https://your-domain.vercel.app`
   - ✓ Landing page should load
   
2. Go to `/login`
   - ✓ Login page should display
   
3. Go to `/register`
   - ✓ Registration page should display
   
4. Create an account
   - ✓ Should register and redirect to dashboard
   
5. Test features
   - ✓ Journal entries
   - ✓ Trips
   - ✓ Memories
   - ✓ Photo uploads (verify S3)

---

## 🐛 Troubleshooting

### Build still fails with "vite: command not found"

**Solution**: Double-check Root Directory is set to `backend` (not blank, not `/`)

### "Connection refused" or database errors

**Solution**: Verify database credentials in environment variables

### File uploads fail or disappear

**Solution**: Confirm S3 is configured correctly in environment variables

### Pages show 404

**Solution**: Check `vercel.json` routing configuration exists

### Slow response times

**Solution**: This is normal for serverless cold starts. Consider Laravel hosting instead.

---

## 📊 What Changed

### Files Modified
- ✅ `backend/resources/js/pages/SettingsPage.vue` - Fixed duplicate `</script>` tag

### Files Created
- ✅ `backend/vercel.json` - Vercel routing configuration
- ✅ `backend/api/index.php` - Laravel serverless bootstrap
- ✅ `VERCEL_DEPLOYMENT_GUIDE.md` - Comprehensive documentation
- ✅ `DEPLOY_TO_VERCEL.md` - This quick start guide

### Build Test Results
```bash
✓ Dependencies: 249 packages installed
✓ TypeScript: Compiled successfully
✓ Vite: 148 modules transformed
✓ Output: 35 assets generated
✓ Build time: 3.89s
✓ Bundle size: 61.56 KB (gzipped)
```

---

## 🎯 Success!

The deployment configuration is now correct. The errors you experienced were due to:

1. **Wrong Root Directory** - Vercel was looking in the wrong place
2. **Wrong build tool assumption** - Project uses Vite, not Vue CLI
3. **Vue syntax error** - Now fixed

**Local build passes** ✅ - The code is ready for deployment.

Configure Vercel settings as shown above and deploy! 🚀
