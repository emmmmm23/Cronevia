# Profile photographs and frames

The profile's **Edit photo & frame** action opens a mobile sheet or desktop dialog. Photo, Frames and Customize sections work with a draft. Save appearance commits it; Cancel and Escape discard it. The same renderer is used in profile, desktop/mobile navigation, admin sidebar, admin user list and admin user detail. An administrator can edit their own appearance from My Profile.

## Original local presets

None, Classic solid ring, Double ring, Dotted ring, Dashed ring, Soft pastel gradient, Burgundy and gold, Hand-drawn outline, Stitched border, Postage-stamp edge, Floral wreath, Small stars and Scrapbook paper frame. All artwork is original inline geometry in `UserAvatar.vue`; no external artwork, attribution, image service or new dependency is used. Color, gap and thickness controls are shown only where supported. Small avatars reduce ornaments. A reserved square encloses the frame; the face is separately clipped.

## Storage and rollout

Run `supabase/migrations/20261028000005_profile_avatars.sql` after the existing migrations. It preserves profiles and legacy HTTPS avatar URLs, adds versioned appearance/crop JSON and optimistic revision checks, and creates the private `cronevia-avatars` bucket. It needs no new environment values or privileged browser credentials. `npm run check:profile-avatars -- --production` checks the hosted schema and anonymous write denial; the release build includes this gate.

The database allows only the authenticated active owner with the required MFA assurance to save their avatar. Existing profile visibility is preserved: administrators can see the current optimized portrait, but cannot fetch another person's uncropped source or change their appearance. Direct profile-column writes are restricted; ordinary profile editing and admin account-status controls retain their existing permissions. Object writes use unique owner/batch paths and cannot overwrite images. Deletion policies protect the current source and optimized photo. The RPC checks uploaded object ownership, existence, MIME and size, then atomically saves the references and validated allowlisted settings. It accepts no CSS or SVG markup.

Input is limited to genuine JPEG, PNG or WebP under 5 MB, 64–8192 pixels per side, and 32 megapixels. Headers are inspected before decoding. Native browser decoding applies EXIF orientation; canvas rendering removes original metadata and preserves alpha. The normalized editable source is optimized (normally up to 2048 pixels on its longest side); the square portrait is 512 pixels. Both are WebP, or PNG on browsers without WebP export, and each must fit the bucket's 2 MB limit. Animated raster inputs become a still portrait.

Sources and portraits use distinct immutable paths. Replacement uploads happen before profile mutation. Only successful saves update reactive profile state; old references are then cleaned up. Re-cropping reuses the original source. Failed saves clean up new uploads without deleting the working avatar. Lost replies are reconciled against the persisted revision/references/appearance. If cleanup is unavailable, the saved portrait remains valid and the interface reports delayed cleanup. No privileged credentials or signed URLs are persisted. Signed URLs are cached per signed-in account, refreshed before expiry and retried once on a broken image; failures show initials with the frame.

## Verification

`npm test`, `npm run test:database`, `npx playwright test --config playwright.avatars.config.ts`, `npm run check:security -- --history`, and `npm run build` cover the model/raster boundaries, real PostgreSQL migration and ownership/MFA/visibility policies, and local browser upload/crop/rotation/replacement/removal/cancel/failure/refresh/re-login/theme/accessibility flows. Browser scenarios intercept Supabase with isolated fixtures and do not alter a real account. Production schema probes access no user data. Real-account enrollment/sign-in and upload behavior still depend on the deployed Supabase service and account session.
