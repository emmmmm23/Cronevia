# Supabase integration

The current runtime is `frontend` (Vue/Vite) with Supabase Auth, PostgreSQL/Data
API, private Storage, and protected database functions. The Laravel files are
retained, but the standalone app has no localhost:8000 or Sanctum dependency.

## Hosted verification: October 11, 2026

Project: `lrgxrfyzakehsnifypmd`. After the migration bundle was run in the SQL
Editor, the live read-only check passed: Auth returned HTTP 200 and all checked
application tables returned permission-denied responses to anonymous requests,
confirming that the tables exist and public reads are blocked. Authenticated
CRUD, real uploads, and scheduled email delivery still need end-to-end checks.

## Deploy the database

Use the connected Supabase integration or an authenticated Supabase CLI. Never
put a database password, access token, or service-role key in `VITE_*`.

For a new database, apply all files in `supabase/migrations` in filename order.
The four completion migrations have already been applied to this hosted project;
do not rerun the bundle. For another project in the original partial state, apply the four
`20261011...` migrations in order. Do not rerun the old partial initial migration.
The completion migration preserves records; the security migration replaces the
app-table policies with the tested ownership rules.

To create one transactional SQL file for this existing project:

```sh
cd frontend
npm run supabase:bundle
```

Review `supabase/apply-existing-project.sql`, then run it once in this project's
SQL editor. This is a migration bundle, not a repeatable seed script. With a
linked CLI, inspect and reconcile the existing migration history before using
`supabase db push`.

Then run `npm run check:supabase`. It makes read-only checks without printing keys
or fetching records. Permission-denied responses on private tables are expected
without a user session; missing-table responses are not.

Set the Auth site URL and redirect allowlist to the real application origin.
For local development allow `http://127.0.0.1:5173/reset-password` (also localhost
if using that hostname). Profiles and settings are created by the signup trigger.
Promote administrators only from a trusted database session.

## Implemented flows

- Supabase authentication, profile updates, preferences, and password changes.
- Journal, trip, itinerary, memory and dashboard screens restored from the
  existing app and connected through a Supabase data service.
- Journal mood, tags, location, direct entry loading, soft deletion and archives.
- Private image uploads, owner folders, signed URLs, covers and upload retries.
- Timeline, title/place search, anniversary memories and a coordinate map.
- Server-enforced capsule message locks, including direct Data API protection.
- Future-letter persistence and a server-only delivery Edge Function.
- Admin metadata/statistics through role-checked RPCs; no browser Auth Admin API.

RLS enforces ownership. Link-validation triggers also reject cross-account trips,
days, itinerary items, memories and media. Content remains private regardless of
the legacy visibility field; sharing is not implemented. Tag/person join tables
are created but denied to browser users pending dedicated workflows. Journal
tags use a text array. Photo uploads accept JPG/PNG/WebP/GIF up to 10 MB.

## Optional scheduled letter delivery

The Edge Function at `supabase/functions/deliver-letters/index.ts` needs the
Supabase-provided URL/service-role key, plus `CRONEVIA_CRON_SECRET` (a strong
random scheduler secret), `RESEND_API_KEY`, and `LETTERS_FROM_EMAIL` (verified sender).

```sh
supabase functions deploy deliver-letters --project-ref lrgxrfyzakehsnifypmd
```

Only this function disables platform JWT verification: it validates its dedicated
scheduler secret before touching data. Configure a scheduled POST to its endpoint
with `Authorization: Bearer <scheduler secret>` using Cron/Vault or another trusted
scheduler. Keep the secret out of the browser and public SQL.

No schedule is enabled by these migrations. Actual delivery requires the function,
provider, secrets and schedule. Recipients are restricted to the owner's confirmed
email, active accounts, and enabled email notifications. Claims are leased for
ten minutes and retried up to five times. Provider requests use idempotency keys.
Inspect `delivery_error` for failures. If an accepted email's DB update fails,
operator reconciliation may be needed beyond the provider's idempotency window.

## Validate and run

Configure the public Supabase URL/key in `frontend/.env`, then:

```sh
cd frontend
npm install
npm run build
npm test
npm run test:database
npm run check:supabase
npm run dev
```

Open http://127.0.0.1:5173. The database suite runs the actual migrations in local
PostgreSQL (PGlite), with test Auth/Storage fixtures. It verifies bootstrap, CRUD,
account isolation, foreign-link ownership, role protection, admin authorization,
storage folders, suspension, itinerary ordering, capsule locks and delivery-field
protection. The build checks Vue templates and scripts with `vue-tsc`.

Hosted authenticated CRUD, real Storage uploads, browser interactions, and email
delivery still require end-to-end checks after deployment. Use two disposable
test accounts to verify save/edit/reload/delete and cross-account isolation.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
