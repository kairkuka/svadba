# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- Clients planning weddings and family celebrations in Kazakhstan who need to discover, compare, contact, and book event vendors.
- Vendors who need to present their work, manage availability, receive booking requests, and understand demand.
- Product/design reviewers using a browser-only screen gallery to audit the current experience before a major UX/UI rework.

## Product Purpose

SVADBA.kz connects celebration clients with event vendors. Clients discover vendors through categories and short-form media, review profiles, save options, contact vendors, and request dates. Vendors build profiles, import media, manage dates and requests, and review activity.

## Operating Context

The product runs as an Expo app across iOS, Android, and web. Primary product surfaces are mobile-sized. The internal UX/UI review gallery is web-only and must not change production behavior.

## Capabilities and Constraints

- Two roles: client and vendor.
- Authentication, onboarding, vendor import, client discovery, vendor detail, event planning, booking requests, account settings, vendor dashboard, calendar, and statistics.
- Expo SDK 57, React Native 0.86, React Native Web 0.21.
- Existing production UI and flows remain unchanged while the review gallery is added.
- Review gallery includes primary screens, onboarding steps, settings/details, and major populated, empty, and offline states.

## Brand Commitments

- Product name: SVADBA.kz.
- Existing Kazakhstani event-marketplace terminology and Russian interface copy remain source truth during audit setup.

## Evidence on Hand

- Current app implementation: `App.tsx`, `src/screens/`, `src/theme/styles.ts`.
- Current product imagery: `assets/`, `store/screenshots/`, and `project-docs/`.
- Current mock catalog and vendor data: `src/data/`.

## Product Principles

- Show real vendor work before asking clients to commit.
- Keep discovery, contact, availability, and booking connected.
- Support client and vendor workflows without hiding role context.
- Make every current state inspectable before redesign decisions are made.

## Accessibility & Inclusion

Preserve React Native accessibility roles, readable text, touch-target clarity, and mobile viewport behavior across iOS, Android, and web.
