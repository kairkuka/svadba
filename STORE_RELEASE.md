# SVADBA.kz Store Release Checklist

This checklist tracks the production path for the official Google Play and App Store release.

## Binary Configuration

- App name: `SVADBA.kz`
- iOS bundle id: `com.svadbakz.app`
- Android package: `com.svadbakz.app`
- App version: `1.0.0`
- EAS project id: `161426eb-a676-4e53-bf96-4d1f0de929eb`
- Production API: `https://d2ne1y5a2elsg5.cloudfront.net/api`
- Production test login: disabled
- Production offline auth fallback: disabled
- Production review gallery routes: disabled
- Google sign-in: requires Google OAuth client ids in Expo/EAS env and backend allowlist.
- Apple ID sign-in: enabled in app config; requires Apple Sign In capability on the App ID.
- Android production submit track: `production`
- Android production release status: `draft`
- iOS App Store Connect app id: `6798542274`

## Commands

Release rule:

- Fix and QA many bugs locally first.
- Do not upload a new binary for every single bug.
- When the owner says `залить новые` / `надо новые залить`, build and submit the latest iOS and Android binaries immediately with `npm run release:all`.
- When the owner says `залить на TestFlight`, this means public/external TestFlight, not only App Store Connect upload or internal TestFlight.
- iOS release is not done until `npx eas-cli submit:status --platform ios` shows the newest build as `external: in beta testing`.
- If the newest build says `external: ready for beta submission`, open App Store Connect and submit that build to external beta review / public TestFlight group before reporting done.

```bash
npm ci
npm run typecheck
npx expo install --check
npx expo config --type public
npm run build:web:production
npm run release:all
```

For the first Android submission, make sure the Google Play app already exists and the Google service account key is uploaded to EAS credentials. The current `releaseStatus: "draft"` keeps the Play release from rolling out automatically after upload.

## Store Console Tasks

- App Store Connect: add privacy policy URL, support URL, age rating, screenshots, app description, keywords, review contact, and App Review notes.
- App Store Connect: complete App Privacy answers for account data, contact data, uploaded media, bookings, identifiers, diagnostics, notifications, and any third-party SDK data.
- App Store Connect: upload to TestFlight first, submit the newest build to public/external TestFlight, confirm the public TestFlight page shows the newest build, then later submit to App Review.
- Google Play Console: complete app access, ads declaration, content rating, target audience, data safety, privacy policy, and store listing.
- Google Play Console: run internal testing first, resolve pre-launch report issues, then promote the draft production release.
- Backend: keep using the CloudFront API until `https://svadba.kz/api` has a valid certificate for `svadba.kz` and routes `/api/bootstrap` correctly.
- Backend: verify auth, vendor, booking, Instagram, moderation, notification, and deletion flows over HTTPS.
- Backend email: configure active SendGrid credits or SMTP fallback; `/api/auth/start-registration` must return `emailSent: true` before store review.
- OAuth: configure `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` for app builds, matching `GOOGLE_*_CLIENT_ID` on the backend, and keep `APPLE_CLIENT_ID`/`APPLE_BUNDLE_ID` aligned with `com.svadbakz.app`.
- Legal: publish public privacy policy and terms pages before store review.

## Production QA

- Fresh client registration and login.
- Fresh vendor registration and login.
- Vendor profile creation.
- Media upload from library.
- Instagram connect or graceful fallback if Meta credentials are not live.
- Catalog search and vendor profile open.
- Booking creation, status update, and chat route.
- Push notification permission prompt and token registration.
- Logout and token cleanup.
- Offline API behavior: no demo login, no `123456` fallback, clear error copy.
- Android back navigation.
- iOS safe areas and permission copy.
