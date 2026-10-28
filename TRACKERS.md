# Creative Trackers

Cronevia's /trackers workspace replaces the standalone Map navigation. /map redirects to /trackers. Trip maps, destination search, GPS, location records, and provider services remain in Trips.

## Pages inspired by the journal references

- Sleep: 24-hour ribbons, night sleep and naps, awake minutes, quality, notes, and actual elapsed duration.
- Habit tracker: independent Coffee, Gym, Walk, and Coke calendars on one monthly sheet. A missing field, Yes, and No remain distinct.
- Walking and steps: monthly bars and daily totals. Steps are manually entered and replace a date's total; there is no pedometer integration.
- Anxiety, activities, and A Year in Pixels: category-based monthly calendars and yearly 12-month grids with personal color keys.
- Custom logs: Yes/No, numeric units, minutes, rating, one or several choices, notes, and optional private photos. Single daily logs or multiple entries are supported.

Trackers continue across months. Today offers focused daily entry; My Trackers provides creation, edit, duplication without entries, personal templates, archive, restore, and permanent deletion. Monthly boards preserve chosen trackers, ordering, desktop width, heading, and appearance.

## Decoration and journal connection

Graph, dotted, lined, and blank paper; paper/ink colors; handwriting, serif, or sans headings. Built-in stickers and private uploaded stickers/backgrounds persist independently of logs. Decorations are arranged within a stable heading area, with drag and accessible position/size/rotation controls, locking, layer changes, removal, and undo/redo. Logging controls stay outside the decoration surface.

Journal pages can retain live links to a tracker or monthly board. These references open the same records; they are not embedded snapshots and do not duplicate values.

## Database and deployment

1. Review and run supabase/apply-creative-trackers.sql in the existing Supabase SQL editor. Generate it again with npm run trackers:bundle from frontend.
2. Run supabase/verify-creative-trackers.sql. This is a read-only inspection of RLS, grants, and the new journal column.
3. Run npm run check:planner-release from frontend with the intended production public URL/key configured. The release command checks the planner and tracker resources before building.
4. Deploy the current commit to Vercel and confirm /trackers and the /map redirect.

The upgrade adds creative_trackers, tracker_logs, tracker_boards, and journal_entries.tracker_links. Existing journal/trip records remain intact. The three versioned migrations are idempotent; writes go through validated, owner-scoped RPCs. Tables grant authenticated users only SELECT with owner/active-account RLS. Anonymous users cannot execute writes. Active-account checks, owner checks, immutable meaning for populated units/fields, duplicate-save handling, and sleep overlap validation run in PostgreSQL.

Uploads reuse the existing private cronevia-media bucket and its authenticated-owner policy under user-id/trackers/. No public bucket or new secret is required. Signed image URLs are generated only for viewing and are not persisted as design data.

## Semantics and limits

- Local dates are kept as date strings. Sleep stores UTC instants plus its IANA zone and is grouped by wake-up date. Repeated clock hours have an explicit first/second choice; nonexistent times are rejected.
- Goals are optional. Existing logs retain goal/unit/config snapshots. Schedule and goal revisions preserve earlier calendar schedules; changing populated units, types, fields, aggregation, or multiplicity requires duplicating the design.
- Missing values are never treated as zero. Summaries identify the month and coverage; future dates are excluded.
- Custom entries keep unrelated fields separate. This release summarizes custom entries by logged days; it does not automatically combine per-field numeric units or provide computed-field formulas.
- Yearly pixels are an overview; the full-size Log a day date picker provides keyboard and mobile entry.
- Decoration is limited to the heading area, not an unrestricted drawing canvas. Drawing, page/PDF export, automatic device syncing, and a public template marketplace are not included.
- Up to 12 custom fields/categories and 50 heading decorations; image uploads up to 5 MB. Images remain private even when linked from a journal.
- This is personal self-recording. Category labels and sleep goals do not produce diagnoses or medical judgments.

## Verification

- npm run test:trackers: leap years, month lengths, missing/zero/No, replacement totals, local dates, cross-midnight/DST sleep, and schedule history.
- npm run test:database: all versioned migrations plus tracker ownership, duplicate saves, goals, sleep overlap, custom values, independent sessions, private board/asset/journal-link isolation, and design duplication.
- npx playwright test --config playwright.trackers.config.ts: mobile/desktop navigation, creation, save/retry, daily replacement, design persistence, custom uploads, monthly board, habit independence, yearly pixels, journal links, and retained Trip map tab.
- npm run check:planner-release: hosted anonymous resource resolution and production Vue/TypeScript build. Authenticated production save/reload should additionally be checked with a normal account after deployment.
