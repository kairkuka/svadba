---
name: SVADBA.kz
description: Content-first social marketplace for discovering and booking Kazakhstan event vendors.
colors:
  app-canvas: "#0C1014"
  surface: "#212328"
  surface-muted: "#25292E"
  separator: "#262626"
  stroke-strong: "#555555"
  text-primary: "#F5F5F5"
  text-secondary: "#A8A8A8"
  action-primary: "#4A5DF9"
  action-soft: "#EEF0FF"
  destructive: "#ED4956"
  success: "#58C322"
  close-friends: "#1CD14F"
  badge: "#FF3040"
  on-media: "#FFFFFF"
  media-backdrop: "#000000"
  action-state: "#1C2555"
  success-state: "#16291A"
typography:
  display:
    fontFamily: "system-ui"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "29px"
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "system-ui"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "27px"
    letterSpacing: "-0.4px"
  title:
    fontFamily: "system-ui"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "23px"
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "normal"
rounded:
  none: "0px"
  micro: "2px"
  compact: "8px"
  control: "10px"
  surface: "12px"
  bubble: "16px"
  sheet: "20px"
  pill: "999px"
  circle: "50%"
spacing:
  optical: "2px"
  micro: "4px"
  dense: "6px"
  compact: "8px"
  compact-plus: "10px"
  cluster: "12px"
  inset: "16px"
  loose: "20px"
  section: "24px"
  major: "32px"
  empty: "40px"
  break: "48px"
  structural: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action-primary}"
    textColor: "{colors.on-media}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    padding: "0 14px"
    height: "44px"
  chip-filter:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  card-vendor:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.surface}"
    padding: "0"
  nav-bottom:
    backgroundColor: "{colors.app-canvas}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
    height: "56px"
---

# Design System: SVADBA.kz

## Overview

**Creative North Star: "Instagram Prism Social Marketplace"**

SVADBA.kz is a content-first social marketplace: vendor work, identity, availability, and contact stay ahead of decorative chrome. The interface borrows Instagram's familiar rhythm—circular identities, edge-to-edge media, compact metadata, stable action placement—while preserving SVADBA.kz terminology and booking workflows.

The world is dark, crisp, and restrained. Neutral chrome lets wedding imagery carry emotion and color; blue-violet marks the next useful action. Density is compact without reducing touch clarity. Avoid ornamental gradients, glass effects, and decorative shadows.

**Key Characteristics:**

- Dark neutral content stage with tonal surface separation.
- Vendor media and identity lead every discovery surface.
- One blue-violet primary action per emphasis group.
- Compact system type with strong names, titles, and prices.
- Circular identities, square media grids, and softly rounded controls.
- Flat hierarchy built with spacing and one-pixel separators.

## Colors

Near-black chrome and cool graphite surfaces keep vendor imagery dominant; blue-violet supplies controlled action emphasis.

### Primary

- **Prism Action** (`#4A5DF9`): Primary buttons, selected dates, progress, active badges, and featured identity rings.

### Secondary

- **Signal Red** (`#ED4956`; badge `#FF3040`): Errors, destructive actions, unread counts, and urgent state only.
- **Availability Green** (`#58C322`; connected `#1CD14F`): Available dates, connected states, and positive status signals.

### Neutral

- **Night Canvas** (`#0C1014`): Root app, navigation, headers, and profile backgrounds.
- **Graphite Surface** (`#212328`): Cards, panels, forms, and contained marketplace modules.
- **Muted Graphite** (`#25292E`): Secondary controls, selected neutral states, and inbound bubbles.
- **Soft White** (`#F5F5F5`): Primary copy and icons.
- **Cool Gray** (`#A8A8A8`): Metadata, helper text, timestamps, and secondary labels.
- **Dark Hairline** (`#262626`): Structural dividers and flat card outlines.
- **Strong Graphite Stroke** (`#555555`): Input and outline-control boundaries.
- **Media White / Black** (`#FFFFFF`, `#000000`): High-contrast overlays and full-screen short-form media.

### Named Rules

**The Content Carries Color Rule.** Keep chrome neutral; let vendor photography and video provide most screen color.

**The One Action Rule.** Use Prism Action for one dominant next step per emphasis group; use neutral surfaces for peers.

## Typography

**Display Font:** Platform system UI
**Body Font:** Platform system UI
**Label/Mono Font:** Platform system UI

**Character:** Native, compact, and immediately legible across Russian, Kazakh, and Latin text. Weight and spacing establish hierarchy; typography does not compete with media.

### Hierarchy

- **Display** (700, 24/29): Screen identity, onboarding, category choice, and major empty-state headings.
- **Headline** (700, 22/27): App identity and vendor-dashboard titles.
- **Title** (700, 18/23): Vendor names, card headings, and modal titles.
- **Body** (400, 14/20): Descriptions, booking details, reviews, and form copy.
- **Label** (600, 12/16): Metadata, tabs, timestamps, badges, and compact control labels.

### Named Rules

**The Native Voice Rule.** Use platform system typography and allow native scaling; never substitute a decorative wedding font in product UI.

**The Strong Identity Rule.** Vendor names, prices, and action labels use semibold or bold weight; supporting context stays regular and muted.

## Layout

Mobile surfaces use a four-unit rhythm and a standard horizontal inset (`spacing.inset`). Main stacks use 12-unit gaps; contained modules use 12–16 units of internal space. Media may run edge to edge or form a two-column discovery grid or gapless three-column profile grid, while text and controls return to the standard inset.

Headers are 56 units high. Bottom navigation content is 56 units on iOS/web and 64 on Android, plus the platform safe-area inset. Full-screen shorts reserve the right rail for 44-unit iOS/web or 48-unit Android actions and keep captions clear of navigation. Forms center at a 400-unit maximum on web. Respect iOS safe areas, Android insets and Back behavior, visible web focus, and content reflow.

Interaction targets are at least 44 × 44 pt on iOS, 44 × 44 CSS px on web, and 48 × 48 dp on Android. Icons normally render at 24px/dp inside those larger targets.

### Locked Size Inventory

| Family | Allowed values | Application |
|---|---|---|
| Type | 11/14, 12/16, 13/17, 14/18, 15/19, 16/21, 18/23, 20/25, 24/30, 32/38 | Size/line-height pairs; no intermediate steps |
| Icons | 12, 16, 18, 20, 24, 32 | 24 navigation; 12–16 verification; 32 display-only |
| Avatars | 24, 28, 32, 40, 44, 56, 64, 90, 150 | Select by identity prominence; rings measured separately |
| Controls | 32 compact, 40 standard, 44 iOS/web, 48 Android | Routine controls never exceed 48 before text scaling |
| Rows | 40 dense, 52–56 standard, 64–72 inbox/request, 72–80 prominent | Whole row remains interactive |
| Insets | 4, 8, 12, 16, 20, 24, 32 | Four-unit rhythm; 2/6/10 only optical or compact corrections |
| Navigation | 56 app bar, 56 iOS/web bottom bar, 64 Android bottom bar, 44–48 tabs | Safe-area inset is added outside content height |
| Media | 1:1 profile, 4:5 feed, 9:16 shorts | Ratios replace arbitrary media heights |

At 360, 390, and 412 widths, type remains fixed and targets stay platform-sized. Compact mode reduces gaps and truncates secondary labels; it never shrinks actions. At 768 and 1,264 breakpoints, the interface adds rails, columns, and whitespace without magnifying mobile components.

**The No Fluid Magnification Rule.** Larger viewports change composition, not component scale. Buttons, icons, type, avatars, and list rows retain their named role size.

**The Separate Target Rule.** Visible glyph and interaction target are independent measurements: a 24 icon always sits inside a 44/48 target.

**The Stable Rails Rule.** Keep navigation and repeated actions spatially fixed; hide secondary labels before compressing touch targets.

## Elevation & Depth

System is flat by default. Production overrides explicitly remove web shadows and native elevation. Depth comes from Night Canvas, two graphite surface tones, media scrims, whitespace, and one-pixel separators—not floating decoration.

**The Shadowless Chrome Rule.** Do not add decorative shadows to cards, navigation, buttons, menus, or panels. Media overlays may use dark scrims for legibility.

## Shapes

Circles identify people and vendors. Full-bleed media and profile grids stay square. Standard cards, inputs, and major controls use gently softened 12px corners; compact action controls use 10px; chat bubbles use 16px; sheets use 20px. Pills are reserved for filters, compact status, and availability.

Borders are flat one-unit or platform hairlines. Selected media may use a two-unit Prism Action outline. Never turn generic containers into pills.

**The Identity Circle Rule.** Avatars and identity rings remain circular at every size; rectangular imagery stays unclipped or uses the surface radius.

## Components

### Buttons

- **Shape:** Soft compact control (`rounded.control`) with 44-unit iOS/web height and 48-unit Android height.
- **Primary:** Prism Action fill, white bold label, and 16-unit horizontal padding.
- **Hover / Focus:** Subtle state darkening or opacity feedback; visible two-unit focus outline on web. Pressed state uses the shared 0.72 opacity treatment.
- **Secondary / Ghost:** Muted Graphite fill or transparent surface with Strong Graphite Stroke; primary text remains Soft White.

### Chips

- **Style:** Compact pill, 36-unit minimum height, Muted Graphite fill, Dark Hairline outline, and short semibold label.
- **State:** Selected state uses Prism Action or the darker Action State surface. Never use chips for long copy.

### Cards / Containers

- **Corner Style:** Gently softened surface (`rounded.surface`); media grids and structural dashboard rows may be square.
- **Background:** Graphite Surface over Night Canvas; Muted Graphite for nested regions.
- **Shadow Strategy:** None.
- **Border:** One-unit Dark Hairline where a contained boundary is needed.
- **Internal Padding:** Usually 14–16 units; media-first cards keep imagery flush and pad copy separately.

### Inputs / Fields

- **Style:** 44-unit iOS/web or 48-unit Android field, Surface or Muted Graphite fill, 12-unit corners, Strong Graphite Stroke, 15/19 input text, Cool Gray placeholder.
- **Focus:** Two-unit visible outline without glow or layout shift.
- **Error / Disabled:** Signal Red communicates error; disabled controls retain shape and reduce opacity to 0.45.

### Navigation

Bottom navigation is a flat Night Canvas bar with a top hairline. Icons use a 24-unit visual size inside platform-compliant targets; active items become Soft White and heavier/filled while inactive items stay Cool Gray. Labels are hidden in compact bottom navigation. Headers use the same canvas, 56-unit height, and a bottom hairline.

### Vendor Identity

Vendor profiles pair a circular 90-unit mobile image with a 98-unit total identity ring; wide profiles use a 150-unit image. Compact stats and 44/48 direct actions follow. Names use 18/23, prices 14/18, and metadata 12–13. Portfolio content shifts into a gapless square media grid beneath 44/48 flat profile tabs.

### Shorts

Short-form vendor media uses a black 9:16 stage, white 14/18 overlay copy, a right-side 44/48 target rail with 24 icons, a 44 identity avatar, and bottom-left caption content. Dark scrims protect legibility; only Contact uses Prism Action.

## Do's and Don'ts

### Do:

- **Do** lead discovery cards and profiles with real vendor media and recognizable identity.
- **Do** use Night Canvas, graphite surfaces, and one-pixel separators to build flat hierarchy.
- **Do** reserve Prism Action for the clearest next step, selected state, or compact identity signal.
- **Do** keep 24px/dp icons inside 44pt iOS, 44px web, or 48dp Android targets.
- **Do** preserve platform system type, native text scaling, safe areas, and visible web focus.
- **Do** keep cards at the standard 12px surface radius unless media or structural continuity requires square edges.

### Don't:

- **Don't** add decorative shadows, glass panels, ornamental gradients, or wedding-themed flourishes to product chrome.
- **Don't** make every surface a floating rounded card; prefer spacing, dividers, and full-bleed media.
- **Don't** use Prism Action on multiple peer actions in the same emphasis group.
- **Don't** shrink touch targets to the visible 24-unit icon.
- **Don't** use pills for generic containers or long labels.
- **Don't** mix unrelated icon families or hard-code icon colors outside semantic and on-media roles.
