# Release Checklist

## Done
- iOS bundle id: `com.svadbakz.app`.
- Android package: `com.svadbakz.app`.
- Production API URL: `https://svadba.kz/api`.
- Test login hidden in production EAS profile.
- Legal pages exist: privacy, terms, support, account deletion.
- iOS build `1.0.0 (4)` uploaded to App Store Connect/TestFlight.
- Android build `1.0.0 (3)` generated as AAB: `builds/svadba-1.0.0-android-v3.aab`.
- Android build `1.0.0 (3)` uploaded to Google Play internal testing.
- TypeScript, Expo Doctor, backend smoke test, production web build pass.

## Before Public Review
- Verify `https://svadba.kz/privacy` opens from public internet.
- Verify `https://svadba.kz/support` opens from public internet.
- Verify SendGrid sender is verified and registration email arrives from production.
- Run iPhone TestFlight smoke test.
- Run Android internal test smoke test after upload.
- Upload store screenshots.
- Fill App Store App Privacy.
- Fill Google Play Data Safety.
- Fill age/content rating.
- Add support contact.
- Submit App Store review.
- Promote Google Play release from internal testing to production or open testing.

## Smoke Test
- Register client with email verification.
- Register supplier with email verification.
- Client selects categories, watches feed, opens supplier profile.
- Client saves supplier.
- Client books date from calendar and sees booking.
- Supplier sees request.
- Supplier changes request status.
- Supplier changes calendar busy dates.
- Supplier opens own profile preview.
- Account deletion request page works.
