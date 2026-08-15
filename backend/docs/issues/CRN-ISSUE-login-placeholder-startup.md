# CRN-ISSUE: Application Always Opens Login Placeholder

**Title:** Application displays "Login page placeholder" at startup  
**Status:** RESOLVED  
**Severity:** High — application unusable  
**Priority:** P1  
**Environment:** Local development (Windows, MariaDB 10.4, Laravel 11, Vue 3 + Vite)

---

## Symptoms

- Running `npm run build` then opening `http://127.0.0.1:8000/` redirected to `/login?redirect=/`
- The `/login` page displayed only: `Login` + `Login page placeholder`
- No actual Cronevia UI was visible

---

## Root Cause (Multi-Layer)

### Layer 1 — Stale Production Build (Primary Cause)

The `public/build/` directory contained chunks compiled **before** `LoginPage.vue` was replaced with the real implementation. Specifically:

```
public/build/assets/LoginPage-DSAnL02g.js
```

This chunk contained the old placeholder component code:
```js
e("h1", "Login"), e("p", "Login page placeholder")
```

When `npm run dev` is not running, `@vite(...)` in `app.blade.php` serves these **stale build files** from `public/build/`. The Vite dev server was not running, so HMR was not serving the updated source files.

**The production build was never regenerated after the source was updated.**

### Layer 2 — All Routes Were Protected (Contributing Cause)

The Vue Router had `meta: { requiresAuth: true }` on the root `/` layout, making every page require authentication. An unauthenticated guest visiting `/` was immediately redirected to `/login?redirect=/`.

This was a design issue — `/` should be a public landing page, not a protected route.

---

## Exact Render Chain (Before Fix)

```
Browser: GET http://127.0.0.1:8000/
→ Laravel: 200 (serves app.blade.php with stale build)
→ Vue app loads stale public/build/assets/app-BE6m7Mxh.js
→ Vue Router beforeEach: auth.initialize() → 401 → guest
→ to.meta.requiresAuth = true, !auth.isAuthenticated = true
→ router redirects to { name: 'login', query: { redirect: '/' } }
→ Browser: /login?redirect=/
→ Vue loads stale LoginPage-DSAnL02g.js
→ Renders: "Login" + "Login page placeholder"
```

---

## Files Investigated

| File | Finding |
|------|---------|
| `resources/js/pages/LoginPage.vue` | Real implementation present — correct |
| `public/build/assets/LoginPage-DSAnL02g.js` | Stale — contained placeholder |
| `resources/js/router/index.ts` | `/` protected with `requiresAuth: true` |
| `frontend/src/pages/LoginPage.vue` | Old separate frontend — placeholder source |

---

## Files Changed

| File | Change |
|------|--------|
| `resources/js/router/index.ts` | Added public `/` landing route; restructured protected routes under explicit paths |
| `resources/js/pages/LandingPage.vue` | **Created** — public landing page for guests |
| `resources/js/components/ui/CrnLogo.vue` | **Created** — inline SVG logo component |
| `resources/js/pages/LoginPage.vue` | Replaced `img` with `CrnLogo` component; added import |
| `resources/js/pages/RegisterPage.vue` | Replaced `img` with `CrnLogo` component; added import |
| `resources/js/components/layout/AppNavbar.vue` | Replaced `img` with `CrnLogo` component; added import |
| `resources/js/components/layout/AppFooter.vue` | Replaced `img` with `CrnLogo` component; added import |
| `public/build/` | **Regenerated** via `npm run build` |

---

## Solution

1. **Rebuilt production assets**: `npm run build` regenerated `public/build/` from current source. LoginPage chunk now contains the real login form.

2. **Added public landing page**: Created `LandingPage.vue` at route `/` with `meta: { public: true }`. Guests now see the Cronevia landing page instead of being redirected to login.

3. **Restructured router**: Protected routes moved to explicit paths (`/home`, `/trips`, `/journal`, etc.). The root `/` is now public.

4. **Removed external image dependency**: Replaced `src="/images/cronevia-logo.png"` with `CrnLogo.vue` (inline SVG) to eliminate the Rollup build error that occurred when the logo file was missing.

---

## Testing

| Test | Expected | Result |
|------|----------|--------|
| `GET /` — unauthenticated | Cronevia landing page | ✅ |
| `GET /login` | Real login form with email/password fields | ✅ |
| `GET /home` — unauthenticated | Redirect to `/login` | ✅ |
| `npm run build` | Successful, 121 modules | ✅ |
| No "Login page placeholder" in new build | Confirmed | ✅ |

---

## Development Commands

```bash
# Terminal 1 — Laravel application server
cd backend
php artisan serve
# → http://127.0.0.1:8000

# Terminal 2 — Vite HMR / asset development
cd backend
npm run dev
# → Vite serves HMR at http://localhost:5173 (assets only)

# Browser → http://127.0.0.1:8000
```

## Regression Notes

- The `frontend/` directory still exists but is no longer part of the application. It can be archived.
- Always run `npm run build` after source changes when using production build mode.
- With `npm run dev` running, Vite HMR serves updated files live without needing a rebuild.
