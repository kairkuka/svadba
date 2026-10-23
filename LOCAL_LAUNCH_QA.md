# Local Launch QA

This checklist is for local and internal builds before any App Store or Google Play submission.

## Required Commands

```bash
npm run cleanup:launch:dry-run
npm run typecheck
node --check server/index.js
node --check server/check-production-readiness.js
node --check server/production-smoke-test.js
npx expo-doctor
npm run build:web:production
```

## Backend

- `GET /health` returns `ok: true`.
- Local development may use `dbStorage: file` and `uploadsStorage: local`.
- Production rehearsal must use `dbStorage: postgres` and `uploadsStorage: s3`.
- Production rehearsal passes `npm run check:production`.
- Production rehearsal passes `npm run check:production:live`.
- Production rehearsal passes `npm run smoke:production` with dedicated client/vendor test accounts.
- Production smoke registers and removes client/vendor push tokens.
- `MODERATION_ADMIN_TOKEN` is set before opening `/admin`.
- `/admin` can load reports, deletion requests, and vendors with `X-Admin-Token`.
- `npm run cleanup:launch` has been run once before real users.

## Auth

- Email registration sends a real email.
- Email code verifies and creates a user.
- Login works after closing and reopening the app.
- Google login works on web, iOS, and Android clients.
- Apple login works on iOS.
- Logout clears the session.

## Client Flow

- Bottom navigation exists on every client screen.
- Catalog opens vendor profiles.
- Save/unsave vendor persists after restart.
- Booking date/time creates a request.
- Client requests screen shows the real booking status.
- Client settings save profile, event, budget, notifications.
- Account deletion request is accepted from legal page.

## Vendor Flow

- Bottom navigation exists on every vendor screen.
- Vendor profile/settings save to backend and public profile.
- Upload photo/video works.
- Upload progress is visible and failed uploads show retry/remove actions.
- Video upload shows `uploading -> processing -> published`.
- Instagram OAuth import works.
- Instagram imported media appears in public profile.
- Calendar busy/free dates persist.
- New client booking appears in vendor requests.
- Vendor status update reaches client request screen.
- Stats use real views, saves, WhatsApp clicks, bookings, and media.

## Push

- Native iOS/Android build asks for notification permission.
- Device registers an Expo push token.
- New booking sends push to vendor.
- Vendor status update sends push to client.
- Tapping a push opens `Заявки`.
- Web correctly shows push as unavailable.

## Moderation

- Client can report a vendor.
- `/admin` shows the report.
- Hide vendor removes it from public catalog.
- Restore vendor returns it to public catalog.
- Delete vendor removes vendor, related bookings, saved ids, analytics, and calendar.
- Delete media removes it from vendor profile and portfolio count.
- Account deletion request can be marked reviewing, completed, or rejected.

## Storage

- File uploads are limited by `MAX_USER_UPLOAD_BYTES`.
- Instagram imports are limited by `MAX_INSTAGRAM_DOWNLOAD_BYTES`.
- Production rehearsal uses S3 public URLs, not local `/uploads`.
- Postgres migration has a backup before running.
- Postgres write requests are serialized with `DATABASE_LOCK_KEY`.
- DB backups go to S3 when `DB_BACKUP_STORAGE=s3`.
- Deleted vendor/profile media is removed from S3.
- Production smoke confirms upload URL opens, S3 object exists, then delete removes it.

## Sentry

- Internal release build has `EXPO_PUBLIC_SENTRY_DSN`.
- Open `/?sentry-test=1` only in an internal build with `EXPO_PUBLIC_SENTRY_TEST_ENABLED=1`.
- Test event appears in Sentry.
- Public store builds use `EXPO_PUBLIC_SENTRY_TEST_ENABLED=0`.
