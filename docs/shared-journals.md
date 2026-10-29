# Shared journals implementation

Feature branch: `codex/shared-journals`. The owner approved production deployment on 2026-10-29 after confirming the hosted invitation return URLs.

## Compatibility and scope

The existing `/journal` list, `/journal/new`, and `/journal/:id` entry viewer/editor retain their route names and parameters. A validated `journal` query selects a shared collection. The distinct public `/journal/invitations/accept` path handles invitations. Authentication returns to that path, never a token-bearing URL. There is no parallel journal editor or routing reorganization.

A journal container groups existing owner entries without changing their IDs or visibility. Existing private, archived, deleted, or restricted entries remain excluded. Only entries explicitly marked shared are readable by members. Owners can opt future entries into sharing. Personal trackers, trips, settings, account information, and unrelated media retain their existing access rules.

Owners manage invitations and members. Editors create and edit shared entries and their attached media, but cannot manage sharing, delete entries, or change private links. Viewers read. Members can leave; the owner cannot leave or transfer ownership.

## Security design

PostgreSQL generates each invitation token from three cryptographically random UUIDs (366 random bits), stores only its SHA-256 digest, and fixes its role and seven-day expiry. Acceptance locks the invitation and journal, checks the current owner's authority, and creates membership atomically. Existing members retain their role without consuming the invitation. An accepted invitation cannot restore removed membership.

The copied URL puts the token in a fragment. An early boot module removes it before router creation and exchanges it with a same-origin endpoint. The endpoint sends only digests to PostgreSQL and places a fresh opaque resumption handle in an HttpOnly, SameSite session cookie. Invitation credentials never enter local/session storage, query strings, analytics, or logs. A non-secret invitation UUID in the query identifies the intended invitation across tabs and authentication. It cannot grant access. The cookie supports sign-in/registration/refresh; acceptance is always explicit. Cross-origin mutations are rejected. Both SQL quotas and bounded endpoint throttling apply.

RLS and narrow RPCs enforce membership and permissions. Versioned entry saves compare the expected version atomically; the UI retains the draft on conflict and offers copy/load-latest actions. Referenced journal assets cannot be overwritten. Shared media reads use short-lived signed URLs; membership removal denies subsequent authorized requests, but cannot erase already downloaded files or invalidate an already issued URL before its short expiry.

New editor saves first create an upload draft. It is readable only by the owner and its editor creator until the final versioned save publishes the writing and full composition together. Other members cannot read unfinished drafts. Editors cannot use draft/archive status to hide an already published entry.

## Release prerequisites

No dependencies were added. The feature uses the existing Vue, Pinia, Vue Router, Supabase client, Node runtime, PostgreSQL, and editor components.

Setup and release status:

1. **Applied on 2026-10-29** to project `lrgxrfyzakehsnifypmd`: the missing `supabase/apply-scrapbook-upgrade.sql` prerequisite, followed by `supabase/migrations/20261029000001_shared_journals.sql`, through the authenticated, project-scoped Supabase MCP connection. The hosted migration ledger records `20261029102624_scrapbook_setup` and `20261029102634_shared_journals`; these correspond to the reviewed local files above. Do not reapply the local sharing file or run an indiscriminate `db push` against this manually upgraded project. The migration backfills containers without changing entry IDs, contents, private visibility, or modification dates, and adds membership/invitation/version/storage rules. Coordinate the application release: the previous client cannot perform unversioned edits of shared entries once the new rules apply.
2. The Vercel endpoint needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`), plus `APP_ORIGIN=https://cronevia.vercel.app`. Never configure a service-role key. Both repository-root and frontend-root Vercel configurations include the endpoint and direct-link fallback. Local Vite uses the same endpoint handler.
3. **Owner confirmed saved on 2026-10-29:** under Supabase Authentication → URL Configuration, the existing URLs were retained and `https://cronevia.vercel.app/journal/invitations/accept` and `https://cronevia.vercel.app/journal/invitations/accept?invitation=*` were added. The latter keeps the non-secret invitation identity on email confirmation. This confirmation is owner-reported; the connection cannot independently read hosted Auth settings. Add equivalent explicit local/preview origins only when needed. Do not allow arbitrary external return destinations. See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
4. Keep the default confirmation link based on `{{ .ConfirmationURL }}`. If using a customized email template, verify that it honors the requested redirect rather than always returning to Site URL. Complete email confirmation in the browser that opened the invitation, or reopen the original invitation after confirming in another browser. The resumption cookie is intentionally a session cookie.
5. Run `npm run check:shared-journals` from `frontend` to verify the hosted schema and anonymous-management denial. `check:planner-release` now requires this check before building a deployment. No invitations or memberships are created by the probe.

The hosted database setup is complete. The public API reports sharing schema version `20261029.1`, and the anonymous-management-denial probe passes. Before/after integrity digests for existing journal IDs, owners, text, visibility, status, archive state, dates, and timestamps match. All existing entries have their correct owner's journal. The new sharing tables have RLS enabled, the private invitation tables have no API-role grants, the sharing definer functions have fixed search paths, and both sticker buckets are private.

The owner confirmed saving both hosted Auth invitation redirect URLs. Independent Auth configuration inspection remains unavailable: the authorized connection can apply database migrations, but the Management API denied its request to read Auth configuration with HTTP 403. Actual email delivery/confirmation and Vercel runtime settings remain unverified. The owner has now approved publishing these prepared changes to the existing Vercel production site.

Local setup has been prepared: the Git-ignored root `.env` contains the existing project's server URL/public key and canonical app origin, and `supabase/config.toml` includes the invitation callback URLs while retaining its previous URL. These local files do not update hosted Auth settings or Vercel runtime variables. Do not push the entire local Auth configuration over production: it contains development defaults unrelated to this feature. OAuth credentials are held by the local CLI credential store, never by repository files.

The hosted security advisor reports no ERROR-level findings. Its private-table no-policy notices are intentional deny-by-default protection, and the invitation exchange/context functions intentionally permit anonymous callers holding a valid high-entropy secret; acceptance still requires authentication. Other callable-definer notices need their function-specific authorization checks, not blanket revocation. Existing notices include [four functions without fixed search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The performance advisor also flags [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [repeated Auth checks in policies](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), and [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). These advisory notices were recorded; this setup does not claim that every pre-existing database issue has been fixed.

## Verification

- After hosted setup, `npm run check:planner-release` passes against the configured production project: planner, tracker, account-security, avatar, tracker-grid, and shared-journal schema/anonymous-denial checks, followed by production type checking and build. These probes do not establish authenticated user-flow or email-delivery verification.
- Real PostgreSQL through PGlite: existing-schema backfill and timestamps, private/archived/deleted isolation, member roles and canonical ownership, explicit single-use acceptance/retry, wrong invitation, expiry/revocation/removal, MFA/suspension, version conflicts, queued duplicate saves/acceptance, attachment/sticker access and immutability, private-photo exclusion, and existing feature regressions pass. PGlite serializes queries in one process; this is not a claim of a hosted multi-connection load test.
- 174 unit tests pass. Endpoint security tests cover exact origins, CSRF controls, input/size limits, hashed exchange, HttpOnly session cookies, authenticated explicit acceptance, server-owned role, quota responses, and safe errors.
- Browser tests use real Edge with explicitly intercepted Supabase fixtures. They validate the frontend and routing contracts, not hosted persistence: nine sharing scenarios plus ten existing scrapbook/editor scenarios. The sharing scenarios include sign-in/registration, refresh, existing members, direct links/back navigation, wrong invitation, denied reads/saves, draft conflicts, and mobile overflow checks. Existing editor checks include six adaptive widths and photo/sticker retries.
- Production type checking and Vite build pass. Existing map-related bundle-size warnings remain; no new dependencies were introduced.
- Eleven existing landing/authentication/theme browser checks pass, including signed-out redirects, return destinations, direct refresh, public landing access, and vintage/light/dark rendering.
- Eight account-security browser checks pass, including a new case confirming that 2FA returns to the exact pending invitation without accepting it.
- The credential/history/build-artifact scan passes. Keep request-body and form-value capture disabled for the invitation endpoint if adding observability later.

## Practical limits

Sharing includes only entries marked `Shared with journal`. Existing private entries must be changed individually in Entry details. There is one existing journal collection per owner; this feature does not add a separate multi-notebook creation workflow. Owners may name the collection when inviting.

New shared photo and referenced-sticker URLs last 60 seconds. Access is checked on focus, every 30 seconds while visible, and on failed authorized operations. Removing membership immediately denies subsequent backend requests; already downloaded content and previously issued URLs cannot be recalled. Older URLs issued before this release can retain their previous lifetime.

Saved shared assets are immutable while referenced. Replace an image with a new upload rather than overwriting it. A photo originally attached to a personal memory/trip must be uploaded as a journal copy before that page can be shared. Personal tracker/trip links remain owner-only in the editor and do not grant access to those resources.

The SQL migration is a one-time migration, not an invitation-reset or ownership-transfer tool. Existing owner entry archive/delete actions remain available; editors cannot archive or delete entries. There is no new ownership-transfer or bulk journal-deletion workflow.
