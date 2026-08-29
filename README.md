# Svadba Mobile

Mobile-first MVP prototype for the wedding services marketplace.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- One app with two roles: client and vendor

## What is implemented now

- Role switch: client / vendor.
- Two-step onboarding with role, city, name, phone number, consent, and OTP code.
- Client home screen.
- Catalog with text search, category chips, city, price and rating filters, sorting, and filter reset.
- Ten demo vendors across the main wedding-service categories.
- Icon-based bottom navigation and action controls with mobile-safe spacing.
- Bottom navigation remains available on vendor, request, chat, service, and portfolio detail screens.
- Vendor cards open on full-card tap, with icon-only favorites and compact verification and availability states.
- Vendor cards and vendor detail screen.
- Saved vendors.
- Client requests.
- Request detail screen.
- Chat screen with local message sending.
- Client profile summary.
- Vendor dashboard.
- Vendor incoming requests.
- Vendor calendar.
- Vendor messages preview.
- Vendor profile summary.
- Vendor service list in the profile.
- Vendor service creation form with validation and moderation status.
- Vendor portfolio screen with case list and media counters.
- Vendor portfolio case creation form with moderation status.
- Static mock data for the first UX slice.
- Source structure split into screens, components, mock data, theme, types, and utils.
- Vendor request form inside the vendor detail screen.
- Newly created client requests appear in the client requests list.
- Basic request form validation and submit state.
- Vendor can confirm or decline a request in the request detail screen.
- API contract scaffolding for catalog and leads.
- API contract scaffolding for vendor services.
- API contract scaffolding for portfolio items.
- React Navigation stack and bottom tab navigation.
- Local mock session storage: the selected role, city, and name survive app restarts.
- Logout action in the shared app header.
- Typed auth endpoints for requesting and verifying an OTP code.
- Local OTP fallback while the backend URL is not configured.
- Catalog, categories, and lead lists load through the API layer.
- Lead creation and status changes use authenticated API requests.
- Loading, connection error, and retry states for API-backed screens.
- Automatic local data mode when the backend URL is not configured.
- Access tokens are stored in the iOS Keychain / Android Keystore-backed storage.
- Notification opt-in and local notification test in both profile types.
- Expo push token registration through the backend API.
- Notification taps open the request list, a specific request, or its chat.
- Notification routing waits for session and marketplace data on cold launch.
- Portfolio media picker for up to 12 photos and videos per case.
- Camera capture, media previews, removal, and cover selection.
- Multipart portfolio upload with file size and video duration validation.
- Create and edit modes for vendor services and portfolio cases.
- Autosaved service and portfolio drafts restored after app restarts.
- Draft cleanup on publication, explicit deletion, and account logout.
- Image resizing to a 1920 px edge with JPEG compression before upload.
- Native video thumbnails generated with `expo-video`.
- Real multipart upload progress with a two-minute media timeout.
- Moderator comments on rejected services and portfolio cases.
- Revision flow that clears the rejection and resubmits content for review.
- Confirmed deletion for services and portfolio cases with API-backed updates.
- Draft media copied from temporary cache into the app document directory.
- Automatic migration of previously saved media draft URIs.
- Separate persistent folders for draft and published portfolio media.
- Cleanup for removed cases, discarded drafts, logout, and orphaned files.

## Project structure

```text
App.tsx
src/
  components/       shared UI blocks
  api/              typed API request helpers and endpoint contracts
  data/             mock data before API integration
  screens/          client, vendor, and detail screens
  storage/          local session persistence
  theme/            colors and shared styles
  types.ts          app-level TypeScript types
  utils/            small formatting helpers
```

## Run

```bash
npm install
npm start
```

Then open the project in Expo Go, iOS Simulator, Android Emulator, or use the Expo web option from the dev server.

## Backend connection

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_BASE_URL`. The mobile app
currently expects these endpoints:

```text
POST  /auth/otp/request
POST  /auth/otp/verify
GET   /categories
GET   /vendors
GET   /vendors/:id
GET   /leads?role=client|vendor
POST  /leads
PATCH /leads/:id/status
POST  /devices/push-token
POST  /vendor/portfolio        multipart/form-data
PATCH /vendor/portfolio/:id    multipart/form-data
DELETE /vendor/portfolio/:id
POST  /vendor/services
PATCH /vendor/services/:id
DELETE /vendor/services/:id
```

Without this environment variable, the same screens work with local demo data.

## Notification payloads

The backend can route a tap by sending one of these objects in notification
`data`:

```json
{ "screen": "requests", "role": "client" }
{ "screen": "lead", "role": "vendor", "leadId": "vl1" }
{ "screen": "chat", "role": "client", "leadId": "l1" }
```

## Check

```bash
npm run typecheck
```

## Next development steps

1. Implement the documented backend endpoints and connect the SMS provider.
2. Create the EAS project and configure APNs / FCM credentials.
3. Add analytics events for notification opens and lead conversions.
4. Add backend-driven moderation history and audit events.
5. Add persisted client favorites and locally created leads for offline mode.
