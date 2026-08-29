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
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
SENDGRID_FROM_NAME=SVADBA.kz
MODERATION_ADMIN_TOKEN=...
```

## Docker

Build:

```bash
docker build -t svadba-mobile .
```

Run:

```bash
docker run -p 4000:4000 --env-file server/.env -v svadba-data:/data svadba-mobile
```

Health check:

```bash
curl https://svadba.kz/health
```

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
