# Production Deploy

## Domain

Main production domain:

```text
https://svadba.kz
```

The app and API are served from the same host:

```text
Web app: https://svadba.kz
API:     https://svadba.kz/api
Legal:   https://svadba.kz/privacy
         https://svadba.kz/terms
         https://svadba.kz/support
         https://svadba.kz/account-deletion
```

## Required Server Environment

Set these variables on the production server:

```text
PORT=4000
PUBLIC_BASE_URL=https://svadba.kz
DATA_DIR=/data
DATABASE_URL=postgresql://...
DATABASE_SSL=1
DATABASE_STATE_KEY=svadba-main
DATABASE_LOCK_KEY=svadba-state:svadba-main
UPLOADS_STORAGE=s3
S3_UPLOAD_BUCKET=...
S3_UPLOAD_PREFIX=uploads
UPLOADS_PUBLIC_BASE_URL=https://media.svadba.kz
MAX_USER_UPLOAD_BYTES=536870912
DB_BACKUP_STORAGE=s3
DB_BACKUP_BUCKET=...
DB_BACKUP_PREFIX=db-backups
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
SENDGRID_FROM_NAME=SVADBA.kz
# Optional fallback if SendGrid is unavailable:
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM_EMAIL=...
SMTP_FROM_NAME=SVADBA.kz
GOOGLE_WEB_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=... # only if your Google web OAuth client requires server-side exchange
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
EXPO_PUBLIC_SENTRY_TEST_ENABLED=0
# Alternative to Sentry: structured client/server errors in Elastic Beanstalk logs.
CLIENT_ERROR_MONITORING=cloudwatch
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=...
SMOKE_API_BASE_URL=https://svadba.kz/api
SMOKE_CLIENT_EMAIL=...
SMOKE_CLIENT_PASSWORD=...
SMOKE_VENDOR_EMAIL=...
SMOKE_VENDOR_PASSWORD=...
SMOKE_MEDIA_FILE=
APPLE_CLIENT_ID=com.svadbakz.app
APPLE_BUNDLE_ID=com.svadbakz.app
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=... # escaped multiline contents of the Sign in with Apple .p8 key
OAUTH_TOKEN_ENCRYPTION_KEY=... # at least 32 random characters
CORS_ALLOWED_ORIGIN=https://svadba.kz
UPLOAD_RATE_LIMIT_WINDOW_MS=900000
UPLOAD_RATE_LIMIT_MAX=120
BOOKING_RATE_LIMIT_WINDOW_MS=3600000
BOOKING_RATE_LIMIT_MAX=60
CLIENT_ERROR_RATE_LIMIT_WINDOW_MS=900000
CLIENT_ERROR_RATE_LIMIT_MAX=60
MODERATION_ADMIN_TOKEN=...
EXPO_PUSH_URL=https://exp.host/--/api/v2/push/send
# Optional when Expo push security is enabled in EAS.
EXPO_PUSH_ACCESS_TOKEN=...
```

Keep real `.env` files only on the server or in the deployment secret manager.
Do not commit `.env` or `server/.env`.

## Docker

Build:

```bash
docker build \
  --build-arg EXPO_PUBLIC_API_BASE_URL=https://svadba.kz/api \
  --build-arg EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" \
  --build-arg EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" \
  --build-arg EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" \
  -t svadba-mobile .
```

Run:

```bash
docker run -p 4000:4000 --env-file server/.env -v svadba-data:/data svadba-mobile
```

The image builds the web app with production public flags:

```text
EXPO_NO_DOTENV=1
EXPO_PUBLIC_SHOW_TEST_LOGIN=0
EXPO_PUBLIC_ALLOW_OFFLINE_AUTH=0
EXPO_PUBLIC_ENABLE_REVIEW_SCREENS=1
```

Health check:

```bash
curl https://svadba.kz/health
npm run check:production
npm run check:production:live
npm run smoke:production
```

Expected production health:

```json
{"ok":true,"dbStorage":"postgres","uploadsStorage":"s3"}
```

Verify the latest S3 database backup with a transactional restore and rollback:

```bash
npm run verify:backup
```

When `CLIENT_ERROR_MONITORING=cloudwatch`, create metric filters for the
`CLIENT_ERROR` and `SERVER_ERROR` log markers and alarms for both metrics.

## Database Migration

Local development can use `server/data/db.json`. Production should use Postgres
through `DATABASE_URL`.

After setting `DATABASE_URL`, migrate the current JSON state once:

```bash
npm run migrate:db:postgres
```

The migration creates a local pre-migration backup in `server/data/backups/`.
Then start the server with the same `DATABASE_URL`. The server stores app state in
`app_state.data` under `DATABASE_STATE_KEY`. Production write requests are serialized
with a Postgres advisory lock through `DATABASE_LOCK_KEY`, so simultaneous booking
or profile updates do not overwrite each other.

Before exposing the deployment to users, run:

```bash
npm run check:production
npm run check:production:live
```

`check:production:live` verifies Postgres connectivity, confirms `app_state`
exists, and writes/deletes a tiny object in the configured S3 upload bucket.

Then run the production smoke test with dedicated client/vendor test accounts:

```bash
npm run smoke:production
```

The smoke test logs into the real test accounts, saves the vendor profile,
uploads a smoke media file, checks that the media URL opens, checks the S3 object,
creates a client booking, verifies the booking in vendor requests, verifies smoke
ids inside Postgres `app_state`, rejects the smoke booking, registers and removes
client/vendor push tokens, removes the smoke media, and waits until the S3 object
is gone.

For Sentry smoke, build an internal release with:

```text
EXPO_PUBLIC_SENTRY_TEST_ENABLED=1
```

Open:

```text
https://svadba.kz/?sentry-test=1
```

After the test event appears in Sentry, turn `EXPO_PUBLIC_SENTRY_TEST_ENABLED`
back to `0` for public store builds.

## Launch Data Cleanup

Before real users, clear old local demo event defaults and stale bookings:

```bash
npm run cleanup:launch:dry-run
npm run cleanup:launch
```

The cleanup is idempotent. It only clears exact old demo event values
(`Кыз узату`, `7 сентября`, `120`, `3 500 000 тг`) and removes bookings whose
client or vendor no longer exists.

## Moderation Admin

Set `MODERATION_ADMIN_TOKEN` and open:

```text
https://svadba.kz/admin
```

The admin page requires the token locally in the browser. It can review content
reports, process account deletion requests, hide or restore vendors, delete vendor
profiles, and delete vendor media. In S3 mode, deleted vendor media objects are
also removed from the upload bucket.

API equivalents:

```text
GET    /api/admin/moderation
PATCH  /api/admin/content-reports/:id
PATCH  /api/admin/account-deletion-requests/:id
PATCH  /api/admin/vendors/:id
DELETE /api/admin/vendors/:id
DELETE /api/admin/vendors/:vendorId/media/:mediaId
```

All admin API calls require `X-Admin-Token: <MODERATION_ADMIN_TOKEN>`.

## VPS With HTTPS

If the production server is a VPS, copy this folder to the server and run:

```bash
docker compose up -d --build
```

`compose.yaml` starts the app and Caddy. Caddy issues HTTPS certificates for
`svadba.kz` and `www.svadba.kz` after DNS points to the VPS.

## DNS

After the production server is created, update PS.kz DNS:

```text
svadba.kz.      A      <production-server-ip>
www.svadba.kz.  CNAME  svadba.kz.
```

If the host gives a CNAME instead of an IP, use:

```text
www.svadba.kz.  CNAME  <host-cname>
```

For the root domain, use the host's required A records unless ALIAS/ANAME is available.

Do not remove existing MX records unless email migration is intentional.

## Mobile Builds

Production EAS builds use:

```text
EXPO_PUBLIC_API_BASE_URL=https://svadba.kz/api
EXPO_PUBLIC_SHOW_TEST_LOGIN=0
```

Before App Store / Play Market upload:

```bash
npm run typecheck
npx expo-doctor
npm run build:web:production
```
