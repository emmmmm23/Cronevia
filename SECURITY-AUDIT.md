# Security audit — 28 October 2026

Scope: 548 tracked files inventoried; Vue 3/Vite SPA, Supabase Auth/Postgres/Storage migrations, Vercel places function and deployment configuration, and retained Laravel 11 source/lockfiles. The live Vercel build deploys `frontend/dist` plus the places function; it does not deploy Laravel. This is a source/configuration review and non-destructive testing, not a penetration test or an ASVS certification.

## Prioritized findings before implementation

| Severity | Evidence | Impact / planned treatment |
| --- | --- | --- |
| Critical (dependency advisory; contextual exposure) | npm audit: MapLibre GL <=6.4.0, GHSA-jrc7-96c5-q579; `frontend/src/services/map-style.ts` accepts attribution configuration | The package sanitizer can miss adjacent unsafe attributes. Current maps use locally constructed raster styles and text-only pins. Sanitize attribution at the application boundary; retain the major-version upgrade as a separately tested compatibility task. |
| High (when MFA is enrolled) | `frontend/src/stores/auth.ts`, `frontend/src/router/index.ts`, `supabase/migrations/20261011000002_access_and_backend.sql` check primary login/ownership but no assurance level | Add authenticator enrollment/challenge/removal, fail-closed route checks, and database/storage restrictions for accounts with verified factors. A UI check alone is insufficient. |
| High (legacy, if separately hosted) | `backend/app/Http/Controllers/Api/V1/AuthController.php::updateProfile` accepts an email change without the password check used by `changeEmail` | Close this alternate credential-change path by requiring the current password and clearing old email verification. Laravel is excluded from the live Vercel build. |
| Medium | `frontend/src/components/AccountSettings.vue` and auth store update passwords without asking for current credentials | Add current-password verification and a fresh authenticator check when enabled. Supabase Auth remains the password authority. Hosted secure-password settings also require owner configuration. |
| Medium | `frontend/api/places.js` verifies the Auth user but not active-account status or MFA; throttling uses a process-local map | Add server-side account/MFA authorization and an atomic database-backed quota. The current in-memory throttle is not a distributed limit. |
| Medium | `vercel.json` / `frontend/vercel.json` only configure asset caching | Add tested framing, MIME, referrer, permissions, HTTPS, private-response caching controls and a CSP starting in Report-Only mode. |
| Medium | Raw error objects logged in auth/stores/services, some backend messages shown verbatim | Remove production console diagnostics; give account flows safe errors. Do not collect request bodies, passwords, OTPs or tokens. |
| Medium (architecture tradeoff) | Supabase SPA persists its session in localStorage | JavaScript running in the origin can read sessions. Keep the supported SPA architecture, strengthen XSS boundaries and MFA, and document a future server-session/HttpOnly-cookie migration. Merely changing a browser-created cookie to HttpOnly is impossible. |
| Low | `.gitignore` protects specific env names; `.env.example` contains real public project configuration | Broaden ignore patterns and provide placeholders only. Public Supabase publishable keys and referrer-restricted map browser keys are not server secrets. |
| Low / legacy deployment risk | `backend/config/cors.php` contains a malformed broad Vercel pattern; registration omits session regeneration; general protected routes lack an active-account check | Fix retained Laravel defaults without changing the live Supabase architecture. |
| Functional defect | AccountSettings persists `theme` but no startup loader, document theme state or CSS integration exists | Apply theme immediately, load saved preferences on sign-in, and preserve them across navigation/reload. Keep vintage defaults and user-designed paper. |

## Existing protections verified in source

Owner-scoped RLS and write RPCs, profile role-change protection, server time locks for capsules, private media storage, upload MIME/size restrictions, parameterized database access, Vue text interpolation, text-only map pins, server-fixed external provider URLs/timeouts, and production source maps disabled by Vite default. No private key, service-role JWT, Supabase secret key, AWS access key or GitHub token found by the initial high-confidence scan of tracked files. This does not prove absence of every possible secret or validate hosting secret configuration.

## Dependency baseline

Initial frontend npm audit: 15 affected packages (4 critical, 8 high, 3 moderate; includes transitive/development advisories). Compatible updates applied within existing ranges reduce the result; final counts and mitigations are recorded after verification. Vite/Vitest/MapLibre fixes requested by npm require major upgrades; no `audit fix --force` is used. Development-server advisories do not make the static Vercel bundle a dev server. Keep dev/test servers bound to loopback.

Legacy Composer audit (`--locked --no-dev`) reports Laravel, CommonMark, Flysystem and HttpFoundation advisories, plus previously ignored Laravel advisories. Laravel is excluded from Vercel deployment. A separately verified framework upgrade is required before deploying that backend; advisory ignores are not a mitigation.

## Completion and external configuration

Implemented: TOTP setup/verification/backup/removal; live identity/assurance route gating; inline 2FA reauthentication preserving trip drafts; current-password and fresh-factor checks for credential changes; optional hosted email nonce support; safe return paths; generic account feedback; local session cleanup even on failed remote sign-out; database/storage/RPC MFA restrictions; atomic place-search quota; attribution HTML reconstruction; production headers; no source maps/console diagnostics; broad credential ignores/placeholders; build/history/artifact checks; advisory CI; compatible locked dependency patches; and working saved vintage/light/dark themes. The vintage palette and personal notebook artwork are preserved. Journal/memory save completion now waits for the saved URL, avoiding a reload race exposed by the new identity checks.

The owner applied migration 20261028000004. A read-only hosted probe returned security_schema_version() = 20261028.4, and unauthenticated protected resources/quota were denied. Email confirmation is enabled. The owner separately confirmed current-password enforcement, secure password change, a 12-character minimum and TOTP enrollment/verification. Private Auth settings cannot be independently inspected using a public key. No production account is enrolled or password changed by these checks.

Verification completed so far:

- Full Vitest suite: 154 tests passed across 17 files.
- Real PostgreSQL/WASM suite: every migration applied, repeated security migration, owner isolation, active accounts, missing/old AAL claims, MFA-required direct reads/writes/storage, definer RPCs, admin access, quota denial/reset and anonymous denial passed.
- Account/theme browser cases: seven passed, including desktop/mobile theme persistence, pending versus verified setup, incorrect/expired codes, new-session challenge, verified removal, password verification, safe redirects, failure handling, and inline draft-preserving 2FA, abandoned setup cleanup, and genuine recovery-callback URL cleanup.
- Tracker browser suite: seven passed, including desktop/mobile grid, sticker dragging/transforms, save/retry/reload, independent habits and private uploads.
- Trip/first-account cases: all sixteen passed across the main run and targeted rerun. A stale session is now verified before opening a private route and returns to Login rather than rendering a false empty collection.
- API contract/security tests: passed (method/origin, identity/MFA/quota denial, query validation, provider normalization and safe errors).
- Production TypeScript/Vite build and hosted anonymous release probes: passed.
- High-confidence source, full Git history and dist credential/artifact scans: no matches found. No production source maps or environment/key files in dist.
- Legacy PHP changed files pass syntax checks. PHPUnit could not run because backend/vendor/autoload.php is absent. No backend database tests were run against a real database.
- The existing npm lint command could not run because ESLint is not installed/configured in this checkout; vue-tsc passed. No unrelated lint tooling was added.

Journal/memory regression: seven selected editing/archive/touch cases passed across the main run and targeted rerun, including six adaptive widths, custom-upload retry and long-writing save/reload. Live deployment/header verification is recorded below after completion.

## Remaining risks and maintenance

The final npm audit reports 8 affected packages (4 critical, 1 high, 3 moderate), down from 15 after compatible patches. MapLibre's reported critical attribution sanitizer issue is mitigated at the application boundary and tested with adjacent event attributes/unsafe links. Its major upgrade remains recommended. Vite/Vitest worker/dev-server advisories require separately tested major upgrades; loopback binding and trusted local test execution reduce exposure but do not remove advisory records. The CI advisory job intentionally reports these failures rather than hiding them. The retained, non-deployed Laravel lockfile also has unresolved advisories; do not host it before a tested upgrade.

The SPA retains browser-readable Supabase sessions; this is not an HttpOnly server-session architecture. Access JWTs and already issued signed image URLs cannot be revoked instantaneously by this client. The full CSP is Report-Only pending a real traffic/third-party integration review. Captcha, leaked-password protection, SMTP/domain settings, owner-account MFA, exact preview redirect lists, hosting logs and platform-level controls still need ongoing owner review; they were not secretly changed or claimed verified.

Sources: [Supabase MFA enforcement](https://supabase.com/docs/guides/auth/auth-mfa), [password policy and reauthentication](https://supabase.com/docs/guides/auth/password-security), [native recovery-session exception](https://github.com/supabase/auth/blob/master/internal/api/user.go), [access-token sign-out limits](https://supabase.com/docs/reference/javascript/auth-signout), [MapLibre advisory and workaround](https://github.com/advisories/GHSA-jrc7-96c5-q579).

No production credentials were rotated and Git history was not rewritten. These improvements reduce specific verified risks; they are not a claim that the entire application is invulnerable.
