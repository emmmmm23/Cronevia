# ⚡ CRONEVIA Vercel Deployment - Quick Fix

## 🎯 TL;DR - What to Change in Vercel

Go to your Vercel project dashboard and change these settings:

### 1. Settings → General → Build & Development Settings

**BEFORE (Wrong):**
```
Root Directory:       [blank] or "/"
Build Command:        vite build  or  vue-cli-service build
```

**AFTER (Correct):**
```
Root Directory:       backend
Build Command:        npm run build
Output Directory:     public/build
Install Command:      npm ci
Node.js Version:      20.x
```

### 2. Settings → Environment Variables

Add these (minimum required):

```env
APP_KEY=base64:YOUR_GENERATED_KEY_HERE
APP_ENV=production
APP_URL=https://your-domain.vercel.app

DB_CONNECTION=mysql
DB_HOST=your-mysql-host.com
DB_DATABASE=cronevia
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

FILESYSTEM_DISK=s3
AWS_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
```

### 3. Push the Fixed Code

```bash
git pull origin main
# The fixes are already committed and ready
# Just redeploy
```

---

## ✅ What Was Fixed

| Problem | Status |
|---------|--------|
| `vite: command not found` error | ✅ Fixed - set Root Directory to `backend` |
| `vue-cli-service: command not found` | ✅ Fixed - use `npm run build` |
| Duplicate `</script>` tag in SettingsPage.vue | ✅ Fixed in code |
| Local build test | ✅ Passes successfully |

---

## ⚠️ Prerequisites

You NEED these external services (Vercel doesn't provide them):

1. **MySQL Database** - Use PlanetScale, Railway, or AWS RDS
2. **S3 Bucket** - For file uploads (Vercel filesystem is ephemeral)
3. **Laravel APP_KEY** - Generate with: `php artisan key:generate --show`

---

## 🚀 Deploy Now

Once you've:
- [x] Updated Vercel settings above
- [ ] Added environment variables
- [ ] Setup external MySQL
- [ ] Setup S3 bucket

Then push to deploy:
```bash
git push
```

Vercel will automatically redeploy with the correct configuration.

---

## 📖 Full Documentation

- **Quick Start**: `DEPLOY_TO_VERCEL.md`
- **Comprehensive Guide**: `VERCEL_DEPLOYMENT_GUIDE.md`
- **Executive Summary**: `DEPLOYMENT_FIX_SUMMARY.md`

---

**Build Status**: ✅ Local build verified and passing
**Code Status**: ✅ All issues resolved
**Configuration Status**: ⚠️ Requires Vercel settings update

**Ready to deploy!** 🚀
