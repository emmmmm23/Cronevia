# Vercel deployment configuration fix

Changed install command from `npm ci --include=dev` to `npm install`, added explicit base path to Vite config, and added Tailwind CSS 4 source directives. The changes resolve the "vite: command not found" build failure and ensure design assets load correctly on Vercel.

**Watch for:** None — configuration changes are correct and well-scoped.

**Verdict**: APPROVED

## High-level view

The install command change from `npm ci --include=dev` to `npm install` solves the core issue: Vercel sets NODE_ENV=production by default, which causes npm ci to skip devDependencies even with the --include=dev flag. Using `npm install` installs all dependencies regardless of NODE_ENV.

The vite.config.ts addition of `base: '/'` ensures asset paths are generated as absolute (`/assets/...`) rather than relative (`./assets/...`), preventing resolution failures when served from Vercel's CDN.

The style.css `@source` directives (`@source "../index.html"` and `@source "./"`) tell Tailwind CSS 4 exactly where to scan for utility classes, ensuring Vue component styles are included in the production build even in Linux CI environments where filesystem scanning behavior differs from local development.

AppLayout.vue received design improvements (navigation bar styling) that are intentional and within scope of "Fix the Design" — these are not accidental modifications.

<details>
<summary>Details</summary>

## Install command switches from ci to install

The vercel.json change from `npm ci --include=dev` to `npm install` directly addresses the "vite: command not found" error. Vercel's build environment sets NODE_ENV=production, and npm ci respects this by skipping devDependencies even when --include=dev is present. The npm install command ignores NODE_ENV and installs all dependencies from package-lock.json, ensuring build tools (vite, vue-tsc, @tailwindcss/vite) are available during the build phase.

This is the standard fix for Vercel deployments where build tools live in devDependencies. The tradeoff is slightly longer install times (npm install is less strict than npm ci), but the build will succeed.

## Vite base path ensures absolute asset URLs

Adding `base: '/'` to vite.config.ts forces Vite to generate absolute asset paths in the production build. Without this, Vite may generate relative paths like `./assets/index-abc123.js`, which break when the HTML file is served through URL rewrites or CDN edge nodes that don't preserve the base path context.

The verification evidence shows the generated index.html contains `<script type="module" crossorigin src="/assets/index-BvLrL12U.js"></script>` — the leading `/` confirms absolute paths. This matches the existing router setup (no base path configured) and won't conflict with the rewrite rule `{ "source": "/(.*)", "destination": "/index.html" }`.

## Tailwind CSS 4 source directives point to components

The two `@source` directives added to style.css after the `@import "tailwindcss"` line tell Tailwind CSS 4 where to scan for utility classes:

```css
@source "../index.html";
@source "./";
```

The first directive (`../index.html`) is correct relative to `frontend/src/style.css` — it points to `frontend/index.html`. The second directive (`./`) points to the src/ directory itself, which recursively scans all files including the Vue components in src/pages/, src/components/, and src/layouts/.

Tailwind CSS 4's auto-scanning can miss files in CI environments due to filesystem timing or symlink resolution differences. Explicit `@source` directives eliminate this variability. The verification evidence confirms the generated CSS (37.57 kB) contains both custom theme variables and utility classes like `.bg-`, `.text-`, `.flex`, proving the scan worked.

## Build verification confirms all changes work

The verification report shows a successful local build (7.30s, exit code 0) with correct output:
- dist/index.html exists with absolute asset paths
- dist/assets/*.css contains Tailwind utilities and custom theme variables  
- 12 CSS files and 49 JS files generated (code-split by page)
- Main bundle 362.19 kB (108.62 kB gzipped)

No errors or warnings reported. The build output structure matches Vercel's expectations (outputDirectory: "frontend/dist" with index.html at root).

## AppLayout.vue design improvements are in scope

The file list shows `frontend/src/layouts/AppLayout.vue` was modified between the deployment commit and the fix commit. The original user request explicitly said "Frontend Issues. Fix the Design" and "that's for the local. But if ran into vercel.app the design isnt good." Navigation bar styling improvements fall under design fixes and are not accidental modifications.

The FRONTEND_DESIGN_FIXED.md document describes the AppLayout.vue changes: sticky header, burgundy branding, active route highlighting, profile dropdown, mobile hamburger menu. These are deliberate design improvements, not configuration drift.

</details>

## File map

<details>
<summary>3 configuration files changed</summary>

- **vercel.json** — install command changed from `npm ci --include=dev` to `npm install`
- **frontend/vite.config.ts** — added `base: '/'` to defineConfig
- **frontend/src/style.css** — added two `@source` directives after `@import "tailwindcss"`

Full diff: commit 0f1d5d8c296b7137a04bbb65e6f00673ba5af383

</details>
