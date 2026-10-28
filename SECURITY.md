# Cronevia security

Report a suspected vulnerability privately to the repository owner. Do not post account data, tokens, setup keys, passwords, signed image URLs or production exploit payloads in public issues. Review [SECURITY-AUDIT.md](SECURITY-AUDIT.md) for the dated findings and verification limits.

## Account protection

The live application uses Supabase Auth; passwords are verified and hashed there. Settings offers verified TOTP authenticator enrollment, backup authenticators, removal requiring a fresh code, current-password verification, a fresh second factor for password changes, optional email reauthentication codes, and session sign-out. Setup secrets remain in component memory only, are cleared after completion/cancellation/unmount, and are never stored in localStorage or logs. This implementation does not invent recovery codes or allow support bypass in the browser. A user who loses every authenticator needs an identity-verified recovery procedure performed by the Supabase project owner.

Primary-password sessions for an account with any verified factor must finish 2FA. Route guards verify live identity and assurance before loading a profile. The database migration adds restrictive MFA policies to application tables and private Storage, and includes MFA in the active-account/admin helpers used by security-definer RPCs. Existing owner policies still apply at AAL2. A user without a verified factor can continue using the app normally. Supabase Auth, not a browser flag, verifies codes.

The SPA uses Supabase's browser session storage. This is a deliberate architecture limit: it is not an HttpOnly-cookie backend. JavaScript running in the origin can read its session. Preventing XSS, preserving safe HTML boundaries and using MFA matter; blocking Developer Tools would not protect it. A future server-session migration must include CSRF defenses, refresh handling and regression testing. Logout revokes refresh sessions; an already issued access JWT can remain usable until expiry. Signed media URLs remain capabilities until their expiry (currently one hour).

## Supabase owner settings

These settings cannot be changed by the application's public key or SQL migration. The owner confirmed the password/TOTP settings on 28 October 2026:

1. Require current password for password changes, enable secure password change / reauthentication, and set minimum new-password length to 12. Existing passwords may still sign in; new credentials are subject to hosted requirements. The account UI also enforces 12–128 characters.
2. Enable authenticator-app (TOTP) enrollment and verification. Users individually enable 2FA; no account has been enrolled automatically.
3. Confirm email confirmation is enabled (verified through public Auth settings). Use exact production/password-recovery redirect URLs; explicitly allow only needed previews. Do not add arbitrary redirect wildcards.
4. Retain server-side Auth sign-in/MFA rate limits; review quotas and enable CAPTCHA/abuse controls when traffic warrants it. Use your own SMTP provider with domain authentication. Leaked-password checks and some session controls depend on the Supabase plan; enable available protections.
5. Prefer a short access-token expiry, enable suitable inactivity controls where supported, and separately enable MFA for the Supabase/Vercel/GitHub owner accounts.

Only items 1–2 were owner-confirmed in this session. No administrator credentials or private hosting configuration were inspected.

## Data, functions and provider access

`supabase/migrations/20261028000004_account_security.sql` is idempotent and preserves existing account/content records. `supabase/verify-account-security.sql` performs read-only inspection. Public `security_schema_version()` reveals only a version constant; it contains no account or system secrets.

The place-search function requires a valid Supabase user and an active, MFA-satisfied account. An atomic owner-scoped RPC limits provider searches to one per second and 30 per minute across function instances. The private quota table has one row per account and no browser grants. Fixed provider hosts, bounded query/coordinate/category/radius inputs, timeouts, bounded response fields and generic failures prevent it becoming an arbitrary proxy. Origin checks supplement bearer authorization; no cookie-authenticated mutating proxy was added.

The application keeps private image uploads in private buckets with existing MIME/size/owner restrictions. It does not accept executable SVG uploads; built-in SVGs are reviewed static assets. User text remains Vue text interpolation. Map attribution is reconstructed as text/HTTPS links before passing it to MapLibre, avoiding its known sanitizer issue; map pins use textContent. Keep these boundaries when adding providers or remote styles.

## Hosting and secrets

Only browser-safe values may use `VITE_`. Supabase publishable/anon keys rely on RLS and are public by design; browser map keys require referrer, API and quota restrictions. The Geoapify key stays server-side. Never place service-role keys in Vite configuration. The build rejects server-only keys in public VITE_ variables before creating browser assets, and the browser client also rejects secret/service-role credentials. Example files contain placeholders. Environment/key files are ignored; `frontend/.env.production` is intentionally tracked public configuration and must never contain server secrets.

Vercel headers enforce no framing, no object embedding, a self-only base URI, HTTPS upgrade, MIME sniffing prevention, a strict cross-origin referrer policy, limited browser permissions and non-caching of app responses. Versioned assets retain immutable caching. The fuller CSP begins in Report-Only mode to preserve existing fonts/maps/uploads; review actual violations before enforcing its script/style/connect restrictions. Report-Only is not an XSS enforcement boundary. No remote CSP reporting endpoint collecting private URLs has been added.

Production builds disable source maps and drop console/debugger calls. Account feedback is generic; common database diagnostic messages are sanitized while preserving status/code handling. Do not add credentials or personal data to server logs. Do not deploy `vite dev`, `vite preview`, Vitest UI or Laravel debug mode publicly. Development servers bind to loopback.

## Maintenance and checks

From `frontend`:

```
npm ci --include=dev
npm run build
npm run check:security -- --history
npm run test:security
npm run test:database
npx playwright test --config playwright.security.config.ts
npx playwright test --config playwright.trackers.config.ts
npx playwright test --config playwright.itinerary.config.ts
npx playwright test --config playwright.scrapbook.config.ts --grep scrapbook
npm audit
npm run check:planner-release
```

GitHub Actions runs build, high-confidence secret/artifact scanning, security/database tests and a separate advisory gate. The advisory gate intentionally stays red while high/critical advisories remain; there is no hidden exception list. Audit reports describe package advisories, not proof that every affected code path is exploitable here. Apply compatible patches normally. Review and test major Vite/Vitest/MapLibre upgrades separately rather than using `npm audit fix --force`.

The retained Laravel backend is excluded from Vercel deployment. It has narrower CORS defaults, registration session rotation and active-account checks, but its locked dependency advisories require a separately tested upgrade before it is hosted. It does not inherit the Supabase MFA flow. Never deploy it with debug output, production credentials shared with development, or unchecked Composer advisory ignores.

Secret scanning covers high-confidence formats, not every conceivable credential. Treat suspected exposure as an incident: revoke/rotate the affected secret, review access logs and remove it from history only with owner approval. This update does not rotate credentials or rewrite Git history.
