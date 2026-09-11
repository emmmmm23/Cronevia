# 🚀 Vercel Deployment Guide for CRONEVIA

## ⚠️ IMPORTANT: Deploy Frontend Only

You should deploy the **frontend** folder to Vercel, NOT the backend!

```
✅ Deploy: frontend/ (Vue 3 + Vite)
❌ Don't Deploy: backend/ (Laravel - not needed with Supabase)
```

---

## 🎯 Quick Deployment Steps

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to**: https://vercel.com
2. **Click**: "Add New" → "Project"
3. **Import**: Your GitHub repository
4. **Configure**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://lrgxrfyzakehsnifypmd.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

6. **Click**: "Deploy"

---

### Option B: Deploy via Vercel CLI

```bash
cd frontend

# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? cronevia
# - Directory? ./
# - Override settings? No

# After first deployment, configure:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## 🔧 Fix Common Deployment Errors

### Error: "Build failed" or "npm ERR!"

**Cause**: Building from wrong directory or missing dependencies

**Fix**:
1. Make sure you're deploying `frontend/` not root
2. In Vercel settings:
   - Root Directory: `frontend`
   - Framework: Vite
   - Build Command: `npm run build`

### Error: "TypeScript errors"

**Cause**: Type checking during build

**Fix**: Update `frontend/package.json`:
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

Or fix TypeScript errors before deploying.

### Error: "Environment variables not found"

**Cause**: Missing Supabase credentials

**Fix**: Add in Vercel dashboard:
- Settings → Environment Variables
- Add `VITE_SUPABASE_URL`
- Add `VITE_SUPABASE_ANON_KEY`
- Redeploy

### Error: "404 on refresh"

**Cause**: SPA routing not configured

**Fix**: Already handled by `vercel.json` (routes all to index.html)

---

## 📝 Vercel Configuration File

The `frontend/vercel.json` file is already created for you with:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

This ensures:
- ✅ Vite builds correctly
- ✅ SPA routing works
- ✅ Assets are cached properly

---

## 🔐 Environment Variables for Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required:
```
VITE_SUPABASE_URL=https://lrgxrfyzakehsnifypmd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here-from-supabase-dashboard
```

### Optional:
```
VITE_SENTRY_DSN=your-sentry-dsn-if-using-error-tracking
```

**Get anon key from**: https://app.supabase.com/project/lrgxrfyzakehsnifypmd/settings/api

---

## ✅ Deployment Checklist

Before deploying:

- [ ] Supabase database is set up (migrations run)
- [ ] `.env` has correct Supabase credentials locally
- [ ] App works locally (`npm run dev`)
- [ ] Can register and login locally
- [ ] `npm run build` works without errors locally
- [ ] Committed latest changes to git
- [ ] Pushed to GitHub/GitLab

During Vercel setup:

- [ ] Root directory set to `frontend`
- [ ] Framework preset is Vite
- [ ] Build command is `npm run build`
- [ ] Output directory is `dist`
- [ ] Environment variables added
- [ ] Domain configured (optional)

After deployment:

- [ ] Visit your Vercel URL
- [ ] Can see landing page
- [ ] Can register new user
- [ ] Can login
- [ ] Protected routes work
- [ ] No console errors

---

## 🏗️ Architecture After Deployment

```
┌────────────────────────────────────────┐
│         VERCEL (CDN/Edge)              │
│    https://cronevia.vercel.app         │
│                                        │
│    ┌─────────────────────────┐        │
│    │   Vue 3 Static Files     │        │
│    │   (HTML, CSS, JS)        │        │
│    └─────────────────────────┘        │
└─────────────────┬──────────────────────┘
                  │
                  ↓
        ┌─────────────────────┐
        │     SUPABASE        │
        │   (Tokyo Region)    │
        │                     │
        │  • Authentication   │
        │  • PostgreSQL       │
        │  • Storage          │
        │  • Row Security     │
        └─────────────────────┘
```

**No Laravel backend needed on Vercel!** 🎉

---

## 🔄 Continuous Deployment

Once set up, Vercel auto-deploys when you push to git:

```bash
git add .
git commit -m "Update frontend"
git push origin main

# Vercel automatically:
# 1. Detects the push
# 2. Runs npm install
# 3. Runs npm run build
# 4. Deploys to production
```

---

## 🐛 Debugging Deployment Issues

### Check Build Logs

1. Go to Vercel Dashboard
2. Click your project
3. Click latest deployment
4. Check "Build Logs" for errors

### Common Issues

**"Cannot find module"**
→ Missing dependency in package.json
→ Run `npm install` locally first

**"TypeScript error"**
→ Fix TypeScript errors
→ Or temporarily skip type checking in build

**"Environment variable undefined"**
→ Check Vercel environment variables
→ Make sure they start with `VITE_`

**"404 on direct URL access"**
→ Check vercel.json routes configuration
→ Should redirect all to index.html

---

## 📱 Custom Domain (Optional)

To use your own domain:

1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: www (or @)
   Value: cname.vercel-dns.com
   ```
4. Wait for DNS propagation (5-60 minutes)

---

## 🔒 Security Checklist for Production

Before going live:

- [ ] `VITE_SUPABASE_ANON_KEY` added to Vercel (safe to expose)
- [ ] **Never** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel
- [ ] RLS policies enabled on all Supabase tables
- [ ] Email confirmation enabled (optional)
- [ ] Custom domain uses HTTPS (automatic with Vercel)
- [ ] Error tracking configured (Sentry optional)

---

## 📊 What About the Laravel Backend?

**You don't need to deploy it!** 

With Supabase, your architecture is:
```
Frontend (Vercel) → Supabase (Auth + Database + Storage)
```

The Laravel backend can be:
- ✅ Archived (if all features migrated)
- ✅ Kept locally for reference
- ✅ Used temporarily during migration

---

## 🚀 Ready to Deploy?

### Step-by-Step:

1. **Commit vercel.json**:
   ```bash
   git add frontend/vercel.json
   git commit -m "Add Vercel configuration"
   git push
   ```

2. **Go to Vercel Dashboard**:
   - https://vercel.com/new
   - Import your repository
   - Configure as shown above

3. **Add environment variables**

4. **Deploy!**

---

## ✅ Success!

Once deployed, you'll have:
- ✅ Fast CDN delivery (Vercel Edge Network)
- ✅ Automatic HTTPS
- ✅ Auto-deployments on git push
- ✅ Preview deployments for branches
- ✅ Analytics (if enabled)

Your Cronevia app will be live at:
`https://cronevia-[random].vercel.app`

---

## 🆘 Still Getting Errors?

Share the error message and I'll help debug! Common places to check:

1. Vercel Build Logs
2. Browser Console (after deployment)
3. Vercel Environment Variables
4. `frontend/package.json` scripts

---

**Ready to deploy?** Follow Option A (Vercel Dashboard) for the easiest experience! 🚀
