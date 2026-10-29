# Instagram Design System — Public Reconstruction

> Version: 2026.09 · Platforms: iOS, Android, responsive web · Status: implementation reference
>
> This is an independent reconstruction from public Instagram interfaces and Meta's published brand material. It is not Instagram's confidential internal design system, is not endorsed by Meta, and does not grant rights to Instagram trademarks, logos, wordmarks, fonts, screenshots, or product assets.

## 0. Accuracy and usage

Three confidence levels are used throughout:

- **Official** — explicitly documented by Instagram or Meta.
- **Observed** — measured from the public Instagram web interface on 2026-09-10.
- **Reconstruction** — normalized from recurring public iOS, Android, and web patterns. Validate against the exact app build before pixel-parity work.

Do not redistribute reconstructed logo artwork or package proprietary fonts. Meta requires brand users to obtain logos and screenshots from its official Brand Resource Center and follow its usage rules. Use this document to reproduce interaction grammar and visual structure, not to imply affiliation.

## 1. System thesis

Instagram's product interface is a content stage, not a branded poster.

1. **Content carries color.** Product chrome is predominantly neutral. The gradient is reserved for brand moments, Stories, Live, creation, and identity signals.
2. **Controls disappear until needed.** Navigation is familiar, icon-led, and spatially stable. Media, people, and conversation remain dominant.
3. **One action per emphasis level.** A screen may contain many actions, but usually only one uses the primary accent.
4. **Recognition beats novelty.** Repeated placements—avatar left, overflow right, reactions below media, bottom/side navigation—reduce relearning.
5. **Density stays breathable.** Type is compact, but rows preserve generous touch areas and predictable rhythm.
6. **Motion explains causality.** Sheets rise, stacks push, hearts burst from the touched content, and media transitions preserve spatial context.
7. **The system is adaptive, not merely responsive.** iOS, Android, and web share intent while retaining platform typography, safe areas, back behavior, focus, and hover.

## 2. 2026 brand layer

Meta's August 2026 refresh keeps the script wordmark, makes it bolder and simpler, reduces decorative gradient use, adds breathing room, and expands the type family. The refreshed identity is rolling out progressively, so product builds may mix old and new brand moments.

### 2.1 Brand assets

| Asset | Use | Rule |
|---|---|---|
| App icon | Launcher, store listing, owned-product identity | Use only approved source artwork; never redraw from this document |
| Glyph | Social-link identity, compact brand attribution | Preserve proportions and clear space; never combine with another mark |
| Script wordmark | Splash, owned surfaces, selected navigation headers | Never typeset with a substitute font |
| “Instagram” word | Editorial copy | Capital I; same size and style as surrounding copy |
| “from Meta” lockup | Launch and attribution moments | Use approved artwork and spacing |

### 2.2 Typography families

| Family | Status | Role |
|---|---|---|
| Instagram Sans | Official, refreshed 2026 | Brand voice, display, campaign, selected creation tools |
| Instagram Sans Regular | Official heritage style | Versatile brand text and Story text |
| Instagram Sans Headline | Official heritage style | Expressive, human display text |
| Instagram Sans Condensed | Official heritage style | Space-efficient expressive compositions |
| Instagram Pen | Official, introduced 2026 | Handwritten expression; short display phrases only |
| Instagram Mono | Official, introduced 2026 | Technical/editorial contrast; short labels and creative text |
| Platform UI fonts | Observed product layer | Dense controls, settings, feed, messages, accessibility scaling |

Instagram Sans draws on the logo's rounded “squircle” geometry, sheared terminals, and distinctive Q/@ details. It was developed across multiple scripts with local typographic experts. Never synthesize missing global scripts by mechanically transforming Latin forms.

### 2.3 Brand gradient

The gradient is officially described as illuminated, dimensional, and intentionally variable rather than one immutable linear formula. Production brand artwork must come from official assets.

Use this approximation only for prototypes and UI state rings:

```css
--ig-gradient-yellow: #FEDA75;
--ig-gradient-orange: #FA7E1E;
--ig-gradient-red: #D62976;
--ig-gradient-magenta: #D300C5;
--ig-gradient-purple: #7638FA;

--ig-story-gradient: conic-gradient(
  from 205deg,
  #FEDA75 0deg,
  #FA7E1E 62deg,
  #D62976 132deg,
  #D300C5 218deg,
  #7638FA 304deg,
  #FEDA75 360deg
);
```

Gradient rules:

- Use for unviewed Story rings, Live/create expression, app identity, and rare celebratory motion.
- Do not fill routine buttons, cards, navigation bars, or settings icons with it.
- Keep product text off complex gradient regions unless contrast is protected by a scrim.
- Prefer the 2026 restrained direction: one gradient event per composition is usually enough.

## 3. Foundations

### 3.1 Coordinate units

| Platform | Layout unit | Type unit | Minimum interaction target |
|---|---:|---:|---:|
| iOS | pt | Dynamic Type text style / pt | 44 × 44 pt |
| Android | dp | sp | 48 × 48 dp |
| Web | CSS px / rem | rem | 44 × 44 CSS px; 48 preferred on coarse pointers |

Media dimensions refer to the content box. Touch targets may be larger than visible icons.

### 3.2 Spacing scale

Base rhythm: 4 units. Two-unit values exist for optical correction, never general layout.

| Token | Value | Primary uses |
|---|---:|---|
| `space-0` | 0 | Edge-to-edge media |
| `space-0_5` | 2 | Badge nudges, optical alignment |
| `space-1` | 4 | Icon-label micro-gap, stacked metadata |
| `space-1_5` | 6 | Compact chips, inline actions |
| `space-2` | 8 | Dense rows, avatar/text gap |
| `space-2_5` | 10 | Post action spacing, compact padding |
| `space-3` | 12 | Standard horizontal cluster gap |
| `space-4` | 16 | Default screen and card inset |
| `space-5` | 20 | Loose component inset |
| `space-6` | 24 | Section separation, modal padding |
| `space-8` | 32 | Major groups |
| `space-10` | 40 | Empty-state internal rhythm |
| `space-12` | 48 | Major section breaks |
| `space-16` | 64 | Desktop structural separation |

Rules:

- Mobile content inset: 12–16.
- Desktop panel inset: 16–24.
- Full-bleed media cancels horizontal inset.
- Adjacent touch targets may visually sit 0–8 apart only when each has its own full target box.
- Use optical, not mathematical, centering for asymmetric icons such as send, bookmark, and camera.

### 3.2.1 Normative sizing system

This section is the implementation source of truth for physical UI size. Color, hierarchy, and component styling never override these measurements. Values describe the visible object unless the row says **target**; target boxes may be larger and transparent.

#### Core measurement tokens

| Token | Value | Required use |
|---|---:|---|
| `size-hairline` | 1 | Separators, input strokes, tab indicators |
| `size-dot-xs` | 2 | Progress and carousel micro-indicators |
| `size-dot-sm` | 4 | Presence and compact status dots |
| `size-dot-md` | 6 | Standard carousel dots |
| `size-dot-lg` | 8 | Online state and map/status markers |
| `size-badge` | 18 | One-digit unread badge minimum |
| `size-badge-lg` | 20 | Two-digit or dashboard badge minimum |
| `size-icon-xs` | 12 | Inline verification/detail glyph only |
| `size-icon-sm` | 16 | Compact badge, input affordance |
| `size-icon-md` | 18 | Chevron, row accessory, small action |
| `size-icon-lg` | 20 | Field icon, secondary action |
| `size-icon-nav` | 24 | Navigation and primary action icon |
| `size-icon-display` | 28–32 | Empty state or creation feature only |
| `size-target-ios` | 44 | Minimum iOS and fine-pointer target |
| `size-target-android` | 48 | Minimum Android and coarse-pointer target |
| `size-content-mobile` | 390 reference | Primary review width; layouts must also pass 360 and 412 |
| `size-feed-max` | 470 | Standard desktop media/feed column |
| `size-modal-sm` | 400 | Authentication, narrow confirmation |
| `size-modal-md` | 700 | Settings and multi-step workflows |

#### Typography metrics

Text uses the following locked size/line-height pairs. Do not create intermediate sizes for convenience.

| Token | Size / line | Weight range | Exact use |
|---|---:|---:|---|
| `type-label-xs` | 11 / 14 | 400–600 | Counts, dense annotation, micro-status |
| `type-label-sm` | 12 / 16 | 400–600 | Metadata, tabs, timestamps, badges |
| `type-body-sm` | 13 / 17 | 400–600 | Secondary descriptions and list previews |
| `type-body-md` | 14 / 18 | 400–700 | Default copy, usernames, buttons |
| `type-input` | 15 / 19 | 400–500 | Text fields, search, composer |
| `type-body-lg` | 16 / 21 | 400–600 | Readable primary copy only |
| `type-title-md` | 18 / 23 | 600–700 | App bar, profile/card title |
| `type-title-lg` | 20 / 25 | 600–700 | Modal and major screen title |
| `type-title-xl` | 24 / 30 | 700 | Page identity and rare count emphasis |
| `type-display` | 32 / 38 | 600–700 | Empty-state/campaign moment only |

Sizing rules for type:

- A routine mobile screen must contain no more than one `title-xl`.
- Button copy is always `body-md` at 600–700; increasing button importance changes fill, not type size.
- Vendor/user names are `body-md` or `title-md`; never 20+ inside lists or media captions.
- Prices use `body-md` strong; analytics totals may use `title-lg` or `title-xl` with tabular numerals.
- Secondary metadata is 12–13, never smaller than 11 and never larger than its parent body copy.
- Verification symbols are 12–16 and align to the cap height, not the line box center.
- Line height is mandatory. Font size without its paired line height is an incomplete token.
- At 200% text scaling, actions grow vertically and copy wraps; icons and avatars do not scale with type.

#### Interaction targets and visible controls

| Component | Visible size | Target size | Internal gap / inset |
|---|---:|---:|---:|
| Navigation icon | 24 | 44 iOS/web, 48 Android | Centered |
| App-bar icon | 20–24 | 44/48 | 10–12 optical inset |
| Inline icon action | 18–20 | 44/48 | Transparent target extension |
| Primary icon-only action | 24 | 44/48 | Centered |
| Verified badge | 12–16 | Non-interactive | 4 from identity text |
| One-digit unread badge | 18 diameter | Non-interactive | 10–11 text |
| Two-digit unread badge | 20 min height, 6 horizontal inset | Non-interactive | 10–11 text |
| Switch | 44 × 24 iOS/web; 48 × 28 Android | Same as visible | 2 inner inset |
| Checkbox/radio visible mark | 20–24 | 44/48 | Centered target |
| Carousel dot | 6; active 18 × 6 | Non-interactive | 4 between dots |

Target rules:

- Adjacent icon targets may touch but their visible glyphs remain at least 8 apart.
- Never make a 24 icon into a 32 icon to satisfy touch size; enlarge the invisible container.
- Every interactive row is itself the target. Do not require tapping only the label or chevron.
- Destructive and confirm actions use the same target size as ordinary actions.

#### Navigation dimensions

| Element | Mobile iOS/web | Mobile Android | Tablet/web |
|---|---:|---:|---:|
| Top app bar content height | 44–56 | 48–56 | 56 |
| Bottom navigation content height | 49–56 | 56–64 | Not used with side rail |
| Bottom navigation item | Equal share × 44 min | Equal share × 48 min | — |
| Compact side rail | — | — | 72 width |
| Expanded side rail | — | — | 244–245 width |
| Side navigation row | — | — | 48–56 height |
| Profile/content tabs | 44–48 | 48 | 48 |

Bottom navigation uses 24 icons and no visible text in the familiar five-destination shell. The center create control may use a visible 44/48 rounded-square target but its plus remains 24.

#### Rows, lists, and identity

| Pattern | Row minimum | Leading object | Horizontal inset | Gap |
|---|---:|---:|---:|---:|
| Dense metadata row | 40 | 28 avatar/icon | 12–16 | 8 |
| Standard settings row | 52–56 | 32–36 icon | 12–16 | 12 |
| Inbox/notification row | 64–72 | 44 avatar | 16 | 12 |
| Prominent suggestion row | 72–80 | 56 avatar | 16 | 12 |
| Post header | 52–56 | 32 avatar | 12–16 | 8 |
| Request/booking row | 64 minimum | 40–44 avatar | 12–16 | 10–12 |

Avatar inventory is locked to `20, 24, 28, 32, 40, 44, 56, 64, 77, 90, 150`. Choose the nearest role; never invent 42, 48, 52, 61, 94, or 98 for identity images. Rings add 4–8 to total diameter and never shrink the image crop.

#### Inputs and buttons

| Control | Height | Horizontal padding | Type | Radius |
|---|---:|---:|---:|---:|
| Compact button | 32 | 12 | 14/18 semibold | 8 |
| Standard button | 36–40 | 16 | 14/18 semibold | 8–10 |
| Large/primary button | 44 iOS/web, 48 Android | 16–20 | 14/18 semibold | 10–12 |
| Single-line input | 44 iOS/web, 48 Android | 12–14 | 15/19 | 12 |
| Search field | 36–40 visual, 44/48 target | 12–16 | 14/18 | 10–12 or pill |
| Composer | 44 minimum, grows with content | 12–16 | 15/19 | 20–24 |
| Textarea | 96 minimum | 12–14 | 14/20 | 12 |
| Chip/filter | 32–36 | 10–12 | 12–14/16–18 | Pill |

Do not use a 50–66 control height on routine mobile screens. Height above 48 is reserved for multiline content, exceptional accessibility expansion, or platform safe-area composition.

#### Cards, panels, and spacing density

| Surface | Internal inset | Item gap | Group separation | Radius |
|---|---:|---:|---:|---:|
| Flat feed/profile region | 0 or 12–16 | 4–8 | 16–24 | 0 |
| Compact card | 12 | 6–8 | 12 | 8–12 |
| Standard card | 16 | 8–12 | 16 | 12 |
| Dialog | 20–24 | 12–16 | 24 | 16 |
| Bottom sheet | 16–24 | 12–16 | 24 | 20 top corners |
| Empty state | 24–40 | 12–16 | 32 | 12–16 |

Never nest a padded card inside another padded card when one separator can express the grouping. A phone-width screen should normally expose 16 horizontal content inset, not compound 16 + 16 + 16 nesting.

#### Media and profile geometry

| Media | Ratio / size | Rule |
|---|---:|---|
| Profile grid tile | 1:1 | Three columns, 1–2 gap, no radius |
| Feed portrait | 4:5 | Full content width |
| Feed square | 1:1 | Full content width |
| Reel/Story | 9:16 | Full-height stage; controls overlay |
| Vendor/category discovery tile | 1:1 or 4:5 | Two-column grid; equal tiles |
| List thumbnail | 44–56 square | 4–8 radius |
| Mobile profile avatar | 90 image | Ring may produce 94–98 total object |
| Desktop profile avatar | 150 image | Ring may produce 154–158 total object |

Media is sized by ratio, not arbitrary fixed height. Fixed heights are allowed only for bounded device previews and known thumbnail roles.

#### Responsive density contract

| Review width | Required behavior |
|---:|---|
| 360 | Compact labels truncate; controls remain 44/48; two-column grids remain usable |
| 390 | Canonical iPhone reference; 16 inset; 24 nav icons; 90 profile avatar |
| 412 | Canonical Android reference; 48 targets; type scale unchanged |
| 768 | Switch to rail-capable layout; do not magnify mobile controls |
| 1,264 | Expanded rail allowed; content column stays 470–630 rather than stretching |

Larger viewports add columns and whitespace; they do not scale up buttons, icons, type, or avatars. Compact mode may reduce gaps and secondary copy but never interaction targets.

#### Sizing acceptance checklist

- Every text value maps to one locked size/line-height pair.
- Every routine glyph is 12, 16, 18, 20, or 24; 28–32 is documented as display-only.
- Every icon-only control separates visible icon size from target size.
- Every iOS/web action reaches 44 and every Android action reaches 48.
- Every avatar uses the locked inventory; rings are measured separately.
- Every media block declares a ratio or named thumbnail role.
- Every navigation bar declares content height separately from safe-area inset.
- Every phone screen passes at 360, 390, and 412 without shrinking type or targets.
- No routine button/input exceeds 48 before accessibility scaling.
- No desktop breakpoint magnifies mobile component dimensions.

### 3.3 Shape system

Instagram shape language moves between circles and softened squares.

| Token | Radius | Use |
|---|---:|---|
| `radius-none` | 0 | Full-bleed media, edge-attached panels |
| `radius-xs` | 2 | Progress bars, tiny indicators |
| `radius-sm` | 4 | Media thumbnails, legacy controls |
| `radius-md` | 8 | Compact buttons, menus, cards |
| `radius-lg` | 12 | Current web inputs, buttons, message composer |
| `radius-xl` | 16 | Dialogs, floating menus, larger controls |
| `radius-2xl` | 20 | Bottom sheets, media cards |
| `radius-3xl` | 24 | Large creation surfaces |
| `radius-pill` | 999 | Pills, search fields, switches, bubbles |
| `radius-circle` | 50% | Avatars, Story rings, round icon buttons |

Do not turn every rectangle into a pill. Pills signal a compact control, state, filter, or message bubble—not a generic container.

### 3.4 Borders and separators

| Token | Specification |
|---|---|
| Hairline | 1 physical pixel where native APIs allow; otherwise 1 CSS px / dp |
| Standard stroke | 1 unit |
| Focus ring | 2 units visible, 2-unit offset where possible |
| Selected Story ring | 2-unit inner gap plus 2–3-unit gradient ring |
| Separator | Full-width for structural panel splits; content-inset for list continuity |

Avoid boxed cards when separation, whitespace, and hierarchy are sufficient.

### 3.5 Elevation

Instagram uses elevation sparingly.

| Level | Surface | Treatment |
|---|---|---|
| 0 | Feed, profile, settings | No shadow; background and separator only |
| 1 | Sticky bars | Separator or subtle tonal shift |
| 2 | Dropdown, tooltip, hover card | `0 4px 12px rgba(0,0,0,.15)` reconstruction |
| 3 | Dialog, floating panel | Observed strong web shadow: `0 4px 32px rgba(11,16,20,.16)` |
| 4 | Story/Reel overlays | Media scrim, not a conventional card shadow |

## 4. Color system

### 4.1 Current product semantic colors

The following values are from Instagram's live web CSS on 2026-09-10. RGB triplets are shown with hex conversions.

| Semantic role | Light | Dark | Usage |
|---|---|---|---|
| Primary background | `#FFFFFF` | `#0C1014` | App/root canvas |
| Secondary background | `#F3F5F7` | `#25292E` | Input, row hover, secondary surface |
| Elevated background | `#FFFFFF` | `#212328` | Dialog, popover, floating panel |
| Secondary elevated | — | `#2B3036` | Nested elevated region |
| Primary text | `#000000` | `#F5F5F5` | Main content |
| Secondary text | `#737373` | `#A8A8A8` | Metadata, helper copy |
| Tertiary text | `#C7C7C7` | `#737373` | Placeholder, disabled-low emphasis |
| Primary icon | `#262626` | `#F5F5F5` | Main actions/navigation |
| Secondary icon | `#8E8E8E` | `#8E8E8E` | Low-emphasis icons |
| Tertiary icon | `#C7C7C7` | `#737373` | Disabled/decorative icons |
| Separator | `#DBDBDB` | `#262626` | Structural dividers |
| Stroke | `#DBDBDB` | `#555555` | Inputs, controls, outlines |
| Primary action | `#4A5DF9` | `#4A5DF9` | Primary button, active messaging |
| Primary hover/pressed | `#4150F7` | `#4150F7` | Hover and pressed state |
| Text link | `#00376B` | `#E0F1FF` | Inline links distinct from action buttons |
| Secondary button fill | `#EFEFEF` | `#363636` | Neutral secondary action |
| Incoming message | `#F3F5F7` | `#25292E` | Message bubble |
| Outgoing message | `#4A5DF9` | `#4A5DF9` | Own message bubble |
| Dropdown surface | `#F3F5F7` | `#29292E` | Menus |
| Badge | `#FF3040` | `#FF3040` | Unread count |
| Error/destructive | `#ED4956` | `#ED4956` | Destructive text and errors |
| Success | `#58C322` | `#58C322` | Success state |
| Close Friends | `#1CD14F` | `#1CD14F` | Close Friends ring/badge |
| Live | `#FF0169` | `#FF0169` | Live badge |
| Subscribers only | `#7638FA` | `#7638FA` | Subscription identity |
| Temporary highlight | `#0095F6` | `#0095F6` | Legacy/transition highlight only |

The primary product action changed from the widely recognized legacy cyan-blue `#0095F6` to the current blue-violet `#4A5DF9` in the observed 2026 web surface. Do not mix both as equivalent primary colors. Keep `#0095F6` only where an existing build still exposes it or a legacy state requires it.

### 4.2 Dark media colors

| Token | Value | Use |
|---|---|---|
| Always black | `#000000` | Media backdrop, scrim base |
| Always white | `#FFFFFF` | Text/icons over dark media |
| Media overlay | `rgba(0,0,0,.40)` | Legibility scrim |
| Bottom media fade | `linear-gradient(transparent, rgba(0,0,0,.60))` | Reels/Stories action region |
| Blur surface | Light `rgba(248,249,249,.80)` / dark `rgba(43,48,54,.50)` | Translucent chrome |
| Hover overlay | `rgba(255,255,255,.10)` dark | Media/control hover |
| Disabled on media | `rgba(255,255,255,.50)` | Inactive over-media control |

### 4.3 Contrast rules

- Body text: target WCAG 2.2 AA, 4.5:1 minimum.
- Large text: 3:1 minimum.
- Essential icons, focus indicators, control boundaries: 3:1 minimum.
- Never rely on ring color alone for Live, Close Friends, selected, error, or unread state; add label, shape, count, or accessible name.
- Do not place `#A8A8A8` body copy on complex media without a solid/scrimmed background.
- Test both themes independently. Dark mode is not an inverted light palette.

## 5. Typography

### 5.1 Product font stacks

```css
--font-ui-web: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  Helvetica, Arial, sans-serif;
--font-ui-meta: Optimistic, system-ui, sans-serif;
--font-ui-ios: "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
--font-ui-android: Roboto, system-ui, sans-serif;
--font-brand: "Instagram Sans", var(--font-ui-web);
--font-brand-pen: "Instagram Pen", cursive;
--font-brand-mono: "Instagram Mono", ui-monospace, monospace;
```

Observed public web login:

- Routine control/link copy: system UI stack, 14 px / 18 px.
- Input copy: Optimistic/system, 15 px / approximately 19 px, weight 500.
- Footer copy: 12 px / 18 px.

### 5.2 Product type scale

| Token | Web | iOS mapping | Android mapping | Weight | Use |
|---|---|---|---|---:|---|
| `display` | 32/38 | Large Title | Display Small | 600–700 | Rare empty state or campaign moment |
| `title-xl` | 24/30 | Title 1 | Headline Small | 700 | Page identity, profile count emphasis |
| `title-lg` | 20/25 | Title 2 | Title Large | 700 | Modal or screen title |
| `title-md` | 18/23 | Headline | Title Medium | 600 | App bar title |
| `body-lg` | 16/21 | Body | Body Large | 400 | Primary readable copy |
| `body-md` | 14/18 | Subheadline | Body Medium | 400 | Default product copy |
| `body-md-strong` | 14/18 | Subheadline semibold | Label Large | 600 | Usernames, key labels, buttons |
| `body-sm` | 13/17 | Footnote | Body Small | 400 | Secondary description |
| `label-sm` | 12/16–18 | Caption 1 | Label Medium | 400–600 | Metadata, tabs, timestamps |
| `label-xs` | 11/14 | Caption 2 | Label Small | 400–600 | Counts and dense annotations |

Rules:

- Usernames generally use `body-md-strong`; display names may use normal weight.
- Buttons use 14/18 at 600 unless the platform's native control style differs.
- Timestamps and tertiary metadata use 12/16–18 in the secondary color.
- Avoid all caps except compact navigation tabs or utility labels; never use long all-caps copy.
- Allow native text scaling. Reflow or truncate secondary labels before restricting accessibility size.
- Use tabular numerals for analytics and stable counters where supported.

### 5.3 Truncation

- Username: single line, end ellipsis.
- Caption preview: 2–3 lines, then “more”.
- Message preview: single line in inbox; preserve time/unread column.
- Bio: multiline; links and mentions remain individually interactive.
- Notification: wrap to 2–3 lines; thumbnail remains aligned to row start.
- Never truncate destructive confirmations or primary error recovery instructions.

## 6. Responsive architecture

### 6.1 Web breakpoints

These are reconstruction ranges matching current public behavior; feature rollouts may adjust exact cutoffs.

| Range | Navigation | Content |
|---|---|---|
| `0–767` compact | Mobile top bar + bottom navigation | Single column, full-width media |
| `768–1,263` medium | Compact left rail around 72 px | Centered primary column; optional secondary panel |
| `1,264+` wide | Expanded left rail around 244–245 px | Primary column plus contextual/right rail where useful |

Secondary right rail typically appears only when at least ~320 px remains after navigation and the primary column. Hide it before compressing feed media below its intended width.

### 6.2 Structural dimensions

| Element | Compact mobile | Tablet/medium web | Wide web |
|---|---:|---:|---:|
| Top app bar | 44–56 + safe area | 56 | 56 |
| Bottom navigation | 49–56 + bottom inset | — | — |
| Compact side navigation | — | 72 | 72 when collapsed |
| Expanded side navigation | — | — | 244–245 |
| Feed content | Viewport width | 470–630 max region | 470–630 max region |
| Core photo/video post | Full width | Commonly 470 | Commonly 470 |
| Reels media | Full viewport | Tall centered canvas | Tall centered canvas |
| Modal max width | Viewport minus 24–32 | 400–700 by task | 400–900 by task |
| DM inbox pane | Full screen | 320–400 | 350–420 |

### 6.3 Safe areas and input methods

- iOS: respect top/bottom safe areas, Dynamic Island, home indicator, keyboard, and edge-swipe back.
- Android: draw edge-to-edge only with status/navigation/IME insets and predictive Back support.
- Web: support mouse, keyboard, touch, visible focus, 200% zoom, and reduced viewport height.
- Sticky bars must not cover focused controls or the last message/composer row.

## 7. Iconography

### 7.1 Construction

| Property | Standard |
|---|---|
| Base grid | 24 × 24 |
| Default visual size | 24 |
| Stroke | ~2, round caps/joins, optical correction allowed |
| Small size | 12, 16, or 18; simplify geometry |
| Large size | 28 or 32; do not merely scale stroke |
| Active navigation | Filled or heavier variant |
| Inactive navigation | Outline variant |
| Touch container | 44 iOS/web; 48 Android |

Rules:

- Use a coherent Instagram-like icon family; do not mix Lucide, Material, SF Symbols, and ad-hoc SVGs on one surface.
- Icons inherit semantic color. Do not hard-code black or white except `on-media` variants.
- Every icon-only action has an accessible name and tooltip on desktop.
- Directional icons mirror in RTL; brand marks, media play direction, and checkmarks do not.

### 7.2 Global navigation inventory

| Icon | Inactive | Active | Typical label |
|---|---|---|---|
| Home | Outline house | Filled house | Home |
| Search | Outline magnifier | Heavier/filled container state | Search |
| Explore | Outline compass | Filled compass | Explore |
| Reels | Outline clapper/play | Filled clapper/play | Reels |
| Messages | Outline messenger/paper plane | Filled messenger | Messages |
| Notifications | Outline heart | Filled heart | Notifications |
| Create | Plus in rounded square | Same with active treatment | Create |
| Profile | User avatar | Avatar + active indicator | Profile |
| Threads | Threads glyph | Active/highlight variant | Threads |
| More | Three horizontal lines | Active row state | More |
| Instagram | Script wordmark or glyph | No active variant | Home/brand |

### 7.3 Content and social inventory

Heart, comment bubble, send/share, bookmark, overflow, carousel layers, tagged people, collaborative post, remix, repost, translate, link, verified badge, music note, audio waveform, volume on/off, captions, closed captions, location pin, shopping/product bag, insights/chart, promote/megaphone, follow add/check.

### 7.4 Creation inventory

Close, back, next, chevron, camera flip, flash on/off/auto, timer, speed, layout grid, dual camera, gallery, multi-select, crop, rotate, expand, text, sticker, GIF, music, effects/sparkles, draw, eraser, undo, alignment, color picker, mention, hashtag, link, location, poll, questions, emoji slider, countdown, Add Yours, captions, accessibility/alt text.

### 7.5 Messaging inventory

New message, video call, audio call, info, camera, microphone, gallery, sticker, GIF, heart/quick reaction, plus/add attachment, vanish/disappearing media, reply, forward, copy, unsend, report, mute, pin, search conversation, shared media.

## 8. Identity primitives

### 8.1 Avatar sizes

| Size | Use |
|---:|---|
| 20–24 | Inline mention, compact attribution |
| 28 | Dense list/meta row |
| 32 | Post header, comment, message bubble attribution |
| 40 | Inbox/notification compact row |
| 44 | Standard list row |
| 56 | Prominent inbox/search/follow suggestion |
| 64–77 | Story tray/profile compact |
| 90 | Mobile profile header common size |
| 150 | Desktop profile header common size |

Avatar rules:

- Crop with `cover`; preserve faces with focal-point metadata if available.
- Private/default avatar uses a neutral silhouette, not initials unless product policy specifies.
- Business/category badges sit outside the image crop.
- A Story state is an external ring, never a tinted avatar image.

### 8.2 Story ring

| State | Visual |
|---|---|
| Unseen | 2–3 unit gradient ring, 2 unit canvas gap |
| Seen | Neutral gray ring |
| Close Friends | Green ring |
| Live | Gradient/Live treatment plus visible LIVE label |
| Own add | Small plus badge at lower-right |
| No Story | No ring |

For a 64 avatar, total Story object is commonly 72–80 including ring and gap.

### 8.3 Verification and badges

- Verified badge is an inline identity signal, 12–16 visual units depending on context.
- Do not use it as a generic success icon.
- Unread badges use `#FF3040`, white text, minimum 18 diameter, 10–11 type, pill expansion for 2+ digits.
- Cap large counts using localized shorthand or `99+` based on context.

## 9. Navigation components

### 9.1 Mobile top app bar

- Height: 44–56 plus top safe area.
- Horizontal inset: 12–16.
- Left: wordmark, back, or account switcher—not all simultaneously.
- Center: title when hierarchy requires it.
- Right: 1–3 icon actions, each in a full touch target.
- Background: primary surface or translucent blur over media.
- Divider: only when it clarifies scrolling content.

### 9.2 Mobile bottom navigation

- 5 primary destinations maximum.
- Equal-width items; centered 24-unit icons.
- No text labels in the familiar consumer app shell; accessibility labels remain mandatory.
- Active state is fill/weight/avatar indicator, not color alone.
- Badge is anchored to icon top-right and must not shift layout.
- Hide or transform only for immersive camera, Stories, or full-screen Reels contexts.

### 9.3 Desktop side navigation

- Expanded width: ~244–245; compact width: ~72.
- Row height: 48–56.
- Row horizontal inset: 12–16; 24 icon; 16 gap to label.
- Hover: secondary background, 8 radius.
- Active: filled/heavier icon and stronger label.
- Brand at top; More/profile anchored toward bottom when height permits.
- Collapse labels before reducing icon targets.

### 9.4 Tabs

- Text tabs: 44–48 minimum target height.
- Profile tabs often use icons with an uppercase/compact label on web.
- Active indicator: 1–2 unit underline or top line, primary text color.
- Inactive: secondary text/icon.
- Tabs remain horizontally scrollable when labels cannot fit; do not shrink below readable size.

## 10. Buttons and controls

### 10.1 Button anatomy

| Size | Height | Horizontal padding | Type |
|---|---:|---:|---|
| Compact | 32 | 12 | 14/18 semibold |
| Standard | 36–40 | 16 | 14/18 semibold |
| Large | 44–48 | 20 | 14–16 semibold |
| Icon only | 44/48 target | — | 20–24 icon |

### 10.2 Button variants

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | `action-primary` | White | None | Single dominant action |
| Primary disabled | Low-contrast action | Disabled-on-color | None | Unavailable action |
| Secondary | Secondary-button fill | Primary text | None | Follow-up/local action |
| Outline | Transparent | Action/link | Action/stroke | Account creation, secondary commitment |
| Borderless | Transparent | Link/action | None | Inline or bar action |
| Destructive | Transparent or destructive fill | Destructive/white | Optional | Delete, block, remove |
| On-media | Scrim/transparent | Always white | Optional white | Story/Reel control |

Current web primary action colors:

```css
--button-primary: rgb(74 93 249);   /* #4A5DF9 */
--button-primary-hover: rgb(65 80 247); /* #4150F7 */
--button-primary-text: #FFFFFF;
```

Interaction states:

- Hover: tonal change, never layout change.
- Pressed: same or slightly deeper tonal change; optional 0.98 scale only for expressive round actions.
- Focus: high-contrast 2-unit ring.
- Loading: preserve width; replace/precede label with spinner; prevent duplicate submission.
- Disabled: retain readable label and remove pointer/activation.

### 10.3 Follow button

- Unfollowed: primary filled, label “Follow”.
- Following: neutral/secondary, label “Following” plus optional chevron.
- Requested: neutral, label “Requested”.
- Compact list version: 32 high; profile primary version: 36–40 high.
- Optimistic state may update immediately, but failure must restore and explain.

### 10.4 Switch

- Track: ~44–48 × 24–28; thumb: 20–24.
- Current web semantic reconstruction: off light `#DBDFE4`, off dark `#2B3036`; on light `#0C1014`, on dark `#F8F9F9`.
- Whole label row is clickable/tappable.
- Label and description remain outside the switch.
- State has programmatic `checked`; never color-only.

### 10.5 Checkbox/radio

- Visual: 20–24; target: 44/48.
- Checkbox uses rounded square and check.
- Radio uses circle and inner dot.
- Use radio for one-of-many; checkbox for independent choices.

### 10.6 Segmented control and chips

- Segmented control: 32–36 high, shared neutral track, selected tonal segment.
- Filter chip: 32–36 high, 12 horizontal padding, 8–pill radius.
- Selection uses fill + type/icon change.
- Chips scroll horizontally rather than wrap unpredictably in feed headers.

## 11. Inputs and search

### 11.1 Text input

| Property | Compact product | Current public auth shell |
|---|---:|---:|
| Height | 44–48 | ~60–64 outer shell |
| Radius | 8–12 | 12 |
| Horizontal padding | 12–16 | 16 |
| Label | Placeholder or floating label | Floating label |
| Text | 14–16 | Observed 15/19, weight 500 |
| Border | 1 stroke | 1 stroke; stronger focus |

States: default, hover web, focus, populated, disabled, read-only, error, success, autofill, password revealed/hidden.

Error behavior:

- Border/icon may use destructive color.
- Error copy appears below in 12–13 type.
- Preserve input value.
- Move focus to the first invalid field after submit only when it improves recovery.

### 11.2 Search field

- Mobile: 36–40 high; web: 40–44.
- Pill or 8–12 radius neutral fill.
- Leading magnifier, placeholder “Search”, trailing clear button when populated.
- Search results separate accounts, audio, tags, places, and recent/history when applicable.
- Debounce remote results; show skeleton, no-results, failure, and retry states.
- Keyboard: Escape clears/closes, arrows traverse suggestions, Enter selects.

### 11.3 Message composer

- Minimum 44–48 high; expands to a capped multiline height.
- Pill boundary with 12–20 horizontal inset.
- Leading camera/add; text region; trailing mic/gallery/sticker/send depending state.
- When text exists, Send replaces low-priority idle actions.
- Composer stays above keyboard and safe area.

## 12. Feed system

### 12.1 Feed post anatomy

Order:

1. Header
2. Media
3. Primary action row
4. Like/view summary
5. Caption
6. Comment preview
7. Timestamp / translation / edited state

### 12.2 Post header

- Height: 52–60.
- Inset: 12–16.
- Avatar: 32.
- Avatar-to-copy gap: 8–10.
- Username: 14/18 semibold.
- Location/collaboration/sponsored metadata: 12/16 secondary.
- Overflow action: 44/48 target aligned right.
- Optional Follow action stays visually secondary to identity.

### 12.3 Media

Supported display ratios:

| Format | Ratio | Notes |
|---|---:|---|
| Square | 1:1 | Classic feed |
| Portrait | 4:5 | Preferred tall feed maximum |
| Landscape | up to 1.91:1 | Letterbox/fit without crop surprise |
| Reel/Story source | 9:16 | Crop/fit treatment depends surface |
| Carousel | Per-item normalized viewport | Preserve position and count |

Media behavior:

- Double tap likes with a centered heart burst.
- Single tap on video toggles playback or UI according to platform convention.
- Carousel swipe locks horizontal intent; page indicator is dots or fraction.
- Tagged-people indicator appears over media without blocking gestures.
- Loading uses aspect-ratio-preserving placeholder to eliminate layout shift.
- Failure provides retry without collapsing the post.

### 12.4 Post action row

- Height: 44–48.
- Left cluster: Like, Comment, Send/Share.
- Right: Save/Bookmark.
- Icon visual: 24; target: 44/48.
- Gap between visible icons: 8–12, with larger invisible targets.
- Liked state: filled heart, destructive/red accent.
- Saved state: filled bookmark in primary icon color.

### 12.5 Caption and comments preview

- Horizontal inset: 12–16.
- Like count: 14/18 semibold.
- Caption username inline and semibold; caption body normal.
- “more”, “View all comments”, timestamp, and translation use secondary text.
- Hashtags and mentions use link semantics and remain individually focusable.

## 13. Stories

### 13.1 Story tray

- Horizontal scroll, no wrapping.
- Item width: ~72–80.
- Avatar: 56–64 plus ring.
- Label: 12/16, one line, end ellipsis.
- Gap: 8–12.
- First item may be “Your story” with add badge.

### 13.2 Story viewer

- Canvas: 9:16 media, black surround when aspect mismatches.
- Progress bars: top safe-area inset, 2–3 high, 2–4 gap.
- Header: avatar 32, username, timestamp, optional audio; overflow/close right.
- Bottom: reply composer, reaction/share controls.
- Tap left/right navigates items; hold pauses; swipe moves account or dismisses per platform.
- All controls are always-white over adaptive scrims.

### 13.3 Story creation

- Full-screen camera/media canvas.
- Tool rails: 44/48 targets; 24 icons.
- Text presets may use Instagram Sans, Headline, Condensed, Pen, Mono, and other licensed creative faces.
- Text background styles must maintain contrast and preserve safe margins.
- Stickers have transform handles only while selected.
- Destructive discard requires confirmation when work would be lost.

## 14. Reels

### 14.1 Viewer composition

- Full-height or tall centered 9:16 media.
- Right rail: avatar/follow, like, comment, share, more; 44/48 target each.
- Bottom-left: username, caption, audio attribution, paid partnership/translation metadata.
- Bottom-right: rotating/linked audio artwork where present.
- Scrims protect text at top/bottom; center media remains clean.
- Desktop may place comments in a side panel instead of obscuring media.

### 14.2 Playback and gestures

- Auto-play active Reel; pause offscreen media.
- Tap toggles pause/play feedback.
- Vertical swipe advances; animation follows finger and settles with spring/deceleration.
- Long press may pause or open contextual behavior according to build.
- Volume preference persists sensibly across session.
- Captions respect OS/app preference and remain clear of action rails.

### 14.3 Reel states

Loading, buffering, paused, muted, captions on/off, sponsored, collaboration, remixable/not remixable, comments off, unavailable audio, content removed, age/region restricted, sensitive-content gate, retry.

## 15. Explore and search results

### 15.1 Explore grid

- Mobile: typically 3 equal columns, 1–2 unit gutters.
- Standard tile: 1:1.
- Featured tile: 2-row or larger module, placed by deterministic mosaic rules.
- Reels/carousel badges sit top-right over a scrim.
- Hover web shows engagement overlay; touch opens directly.
- Skeleton retains exact mosaic geometry.

### 15.2 Search result row

- Height: 56–64.
- Avatar: 44–48.
- Primary: username 14 semibold + verification.
- Secondary: display name/context 14 secondary.
- Right action: Follow/Remove/chevron.
- Recent results add clear affordance; clearing all may require confirmation depending impact.

## 16. Profile

### 16.1 Profile header

Mobile:

- Avatar around 90.
- Counts in a 3-column cluster: posts, followers, following.
- Username/title in app bar.
- Bio, links, category, pronouns, and mutual context below.
- Edit/Share/Follow/Message actions use 32–36 high buttons.

Desktop:

- Avatar around 150.
- Header content aligns in rows beside avatar.
- Primary width remains bounded; no full-viewport stretching.

### 16.2 Highlights

- Horizontal scroll.
- Circle cover: 56–77 mobile, larger on desktop.
- Neutral ring, 1 stroke.
- Label: 12–14, one line.
- Own profile includes New/add state.

### 16.3 Profile content tabs

Grid, Reels, Tagged; Saved for owner only; additional rollout-specific tabs as needed.

- Mobile grid: 3 columns, minimal gutter.
- Web grid: 3 columns with 2–4 gap inside bounded content width.
- Private profile: centered lock/empty state; content grid hidden.
- Empty owner state includes creation CTA; visitor state explains without a CTA they cannot use.

## 17. Comments

### 17.1 Comment row

- Avatar: 32.
- Username + comment inline; 14/18.
- Metadata row: time, likes, Reply; 12 secondary.
- Like icon right: 12–16 visual in 44 target.
- Nested replies indent or connect visually; cap depth and use “View replies”.

### 17.2 Comments surface

- Mobile: full screen or bottom sheet depending entry/context.
- Desktop: side panel or dialog alongside media.
- Header remains sticky; composer remains sticky above safe area/keyboard.
- Sort/filter controls use menu/sheet.
- Deleted, hidden, restricted, and filtered comments get distinct explanatory states.

## 18. Messaging

### 18.1 Inbox

- Row height: 64–76.
- Avatar: 56; group stack allowed.
- Name: 14 semibold when unread, normal when read.
- Preview + time: 14 secondary; unread dot/badge on right.
- Notes appear as speech-bubble-like cards above avatars, not as message previews.
- Desktop split view: inbox list left, conversation right.

### 18.2 Conversation header

- Height: 56–64.
- Avatar: 32–40.
- Name/status center-left.
- Audio call, video call, information actions right.
- Mobile back shows unread count only when helpful.

### 18.3 Message bubbles

| Type | Treatment |
|---|---|
| Outgoing text | `#4A5DF9`, white text, pill/rounded bubble |
| Incoming text | Secondary surface, primary text |
| Consecutive group | Reduced vertical gap; shared-side corners may tighten |
| Reaction | Small floating pill attached to bubble |
| Reply | Quoted context block above/in bubble |
| Media | Rounded thumbnail; minimal chrome |
| Shared post/Reel | Embedded card with identity and media preview |
| System event | Centered secondary text, no speaker bubble |

- Maximum bubble width: ~70–75% mobile; ~60–70% wide chat pane.
- Radius: 18–22 common; tail is optional and usually absent.
- Timestamp/status is revealed contextually, not repeated under every bubble.

## 19. Creation and publishing flow

### 19.1 Flow structure

1. Source selection/camera
2. Crop/format/multi-select
3. Edit/filter/audio
4. Caption/details
5. Accessibility/advanced settings
6. Share progress
7. Success or recoverable failure

### 19.2 Media picker

- Recent media grid with 3–4 columns based on width.
- Preview dominates upper region where used.
- Album picker is a menu/sheet.
- Multi-select numbers preserve selection order.
- Camera tile is an explicit first item when supported.

### 19.3 Edit tools

- Filter thumbnails: square, labeled, horizontally scrollable.
- Adjustments: icon + label grid/list; slider uses 0-centered or bounded numeric logic.
- Reset is available per adjustment and/or globally.
- Original preview on press must be reversible and discoverable.

### 19.4 Publish details

Rows: caption, tag people, location, music, collaborators, audience, cross-post, accessibility/alt text, advanced settings.

- Right thumbnails are 48–64.
- Disclosure rows use chevrons.
- Switch rows keep the switch right-aligned and the full row targetable.
- Sharing progress persists across navigation and recovers from network failure.

## 20. Menus, sheets, dialogs, windows

### 20.1 Context menu / popover

- Width: 200–320; content determines width within viewport bounds.
- Radius: 12–16.
- Padding: 8 outer.
- Row: 44–48 high, 12–16 horizontal inset.
- Icon: 20–24; label: 14; destructive rows use destructive color.
- Shadow level 2–3.
- Keyboard: arrows, Home/End, Enter/Space, Escape; focus returns to trigger.
- Anchor to trigger on desktop; convert to sheet on compact touch layouts.

### 20.2 Bottom sheet

- Top radius: 16–24.
- Drag handle: 32–40 × 4, centered with 8–12 top gap.
- Snap points only when content benefits; avoid arbitrary half-open states.
- Header: optional title + close/back.
- Rows: 48–56.
- Respect bottom safe area.
- Swipe dismissal remains enabled unless unsaved destructive loss requires a guard.

### 20.3 Dialog

| Class | Width | Use |
|---|---:|---|
| Alert | 280–400 | Short irreversible decision |
| Standard | 400–560 | Form, selection, account action |
| Media | 700–900 | Post/media with comments on desktop |

- Radius: 12–16.
- Scrim: `rgba(0,0,0,.40–.65)` depending media/background.
- Title: 18–20 semibold/bold.
- Body: 14–16, secondary when explanatory.
- Action rows: 44–48; destructive isolated by color and/or separation.
- Escape/back dismisses when safe.
- Trap focus on web and restore it to the opener.

### 20.4 Action menu

Used for post/profile overflow:

- Each action is a full-width 48–56 row.
- Destructive actions appear first or are visually isolated only when urgency warrants it.
- Common actions: Report, Unfollow, Add to favorites, Go to post, Share, Copy link, Embed, About this account, Cancel.
- Never put non-actions in action styling.

### 20.5 Toast/snackbar

- Mobile: above bottom navigation/composer; web: bottom-center or contextual.
- Height: 44 minimum; radius 8–12.
- Dark high-contrast surface; 14 text.
- Optional single text action.
- Duration: 3–5 s; longer for complex text; pause on hover/focus.
- Important failures remain visible inline and are not toast-only.

### 20.6 Tooltip

- Desktop only for unfamiliar icon-only actions.
- 12–13 type; 4–8 vertical and 8–12 horizontal padding.
- Appears after a short delay; immediately on keyboard focus.
- Never contains required interaction.

## 21. Lists, rows, cards, and tables

### 21.1 Standard row

- Minimum 48 high; 56–72 when avatar/subtitle exists.
- Left: icon/avatar 24–48.
- Center: title and optional description.
- Right: value, badge, switch, button, or chevron—one primary accessory.
- Use inset separators aligned with center text, unless grouping requires full width.

### 21.2 Settings section

- Section title: 14–16 semibold or 12–13 secondary label, based on hierarchy.
- Rows: 48–56.
- Description follows control or section and uses secondary text.
- Dangerous account controls are separated into their own section.
- Search settings when the list exceeds comfortable scanning.

### 21.3 Embedded content card

- Radius: 8–12.
- Border: 1 separator/stroke.
- Media respects 1:1, 4:5, or fixed preview crop.
- Identity header uses avatar 24–32 and 12–14 type.
- Avoid nested card-on-card elevation.

### 21.4 Analytics table/web data view

- Header: 12–14 semibold secondary/primary.
- Row: 44–52.
- Numeric values: tabular, right-aligned.
- Mobile converts secondary columns to detail rows rather than horizontal micro-text.
- Charts use semantic series colors beyond the Instagram gradient; never use hue without labels.

## 22. System states

Every surface must define:

| State | Pattern |
|---|---|
| Initial loading | Skeleton matching final geometry; no spinner-only blank screen |
| Incremental loading | Inline spinner/skeleton at list end |
| Empty first use | Clear title, explanation, one relevant CTA |
| Empty filtered | Explain filter/search cause; clear/reset action |
| Offline | Preserve cached content; banner/inline retry |
| Recoverable error | Explain what failed and provide retry |
| Permission denied | Explain benefit and route to settings only when useful |
| Private/restricted | Lock/state illustration + explicit access model |
| Removed content | Stable placeholder; do not collapse context unexpectedly |
| Blocked/reported | Confirm state without exposing protected information |
| Rate limited | Plain explanation and retry timing when known |
| Success | Inline confirmation or toast; avoid interruptive modal |

### 22.1 Skeletons

- Neutral surface shimmer or pulse; honor Reduce Motion.
- Avatar skeletons are circles; text uses varied line lengths; media keeps exact ratio.
- Never animate more aggressively than the content it precedes.

### 22.2 Empty-state illustration

- Usually monochrome line icon/illustration, 48–96.
- Title: 20–24 bold.
- Body: 14–16 secondary, max 40–50 characters per line.
- CTA: one primary or text action.
- Do not use celebratory gradient for failure or moderation states.

## 23. Motion

### 23.1 Tokens

Observed web timing/easing:

```css
--motion-extra-short-in: 100ms;
--motion-extra-short-out: 100ms;
--motion-move-in: cubic-bezier(.17, .17, 0, 1);
--motion-move-out: cubic-bezier(.17, .17, 0, 1);
```

Reconstructed extended scale:

| Token | Duration | Use |
|---|---:|---|
| Instant | 0–50 ms | Direct visual toggle where animation adds no value |
| Extra short | 100 ms | Hover, press, icon state |
| Short | 150–200 ms | Menu, tooltip, small crossfade |
| Standard | 200–300 ms | Sheet/dialog, tab content |
| Long | 300–450 ms | Full-screen/media transition |
| Expressive | 450–700 ms | Like burst, celebratory creation moment |

### 23.2 Motion patterns

- Navigation push follows platform convention.
- Bottom sheet moves vertically from its edge.
- Popover scales/fades subtly from anchor.
- Like heart uses fast scale-up, overshoot, fade/settle.
- Story/Reel paging follows gesture velocity.
- Loading shimmer becomes a static tonal placeholder under Reduce Motion.
- Never animate layout just to decorate the feed.

## 24. Accessibility

### 24.1 Required behavior

- Native screen reader support: VoiceOver and TalkBack.
- Web semantics: real buttons, links, headings, inputs, dialogs, lists, and tabs.
- Visible focus on every interactive element.
- Logical reading/focus order independent of visual CSS order.
- 44 pt iOS / 48 dp Android / 44 px web minimum targets.
- Text scaling without clipped controls or inaccessible actions.
- Captions for video and user-editable alt text for images.
- Automatic alt text may supplement, never block author-provided descriptions.
- Announce like, follow, save, sent, failed, and loading state changes.
- Preserve focus after menus/dialogs close.
- Honor Reduce Motion, high contrast, bold text, and platform color filters.

### 24.2 Accessible names

Bad: “button”, “heart”, “more”.

Good:

- “Like post by @username” / “Unlike post by @username”
- “View 12 comments”
- “Share post”
- “Save post” / “Remove from saved”
- “More options for post by @username”
- “Story by @username, unseen”
- “Mute video” / “Unmute video”

### 24.3 Media

- Decorative profile rings are hidden from assistive technology; their state is in the avatar's accessible label.
- Carousel announces item position, e.g. “Photo 2 of 5”.
- Autoplay video must expose pause and mute.
- Captions do not cover essential content or controls.
- Do not auto-advance critical instructional content before it can be read.

## 25. Internationalization

- Support RTL mirroring for navigation and directional controls.
- Usernames remain logically intact and should not be visually reordered incorrectly.
- Allow 30–50% label expansion.
- Use locale-aware compact numbers, dates, times, pluralization, and relative timestamps.
- Do not concatenate translated fragments.
- Instagram Sans global scripts must use approved native designs; otherwise use the platform UI font for the script.
- Mixed-script bios/captions need Unicode bidi isolation around usernames, hashtags, and counts.

## 26. Content design

### 26.1 Voice

- Direct, human, compact.
- Prefer verbs: Follow, Message, Share, Save, Try again.
- Explain consequences before destructive actions.
- Avoid blaming users for network, permission, or moderation-system failures.
- Use sentence case except established navigation labels.

### 26.2 Confirmation copy pattern

```text
Title: Delete post?
Body: You can’t undo this action.
Primary destructive: Delete
Secondary: Cancel
```

If recovery exists, say where and how long instead of claiming permanence.

## 27. Z-order and overlays

| Layer | Example | Suggested web z band |
|---|---|---:|
| Base | Feed/profile content | 0–9 |
| Sticky | App bars/navigation | 10–99 |
| Floating | Tooltips/hover cards | 100–199 |
| Popover | Menus/account switcher | 200–299 |
| Sheet | Bottom/side sheets | 300–399 |
| Dialog | Modal/alert/media viewer | 400–499 |
| Toast | Global transient feedback | 500–599 |
| Critical | Permission/system interstitial | 600+ |

Use a small named layer scale. Never solve overlay bugs with arbitrary five-digit values.

## 28. Token starter set

```css
:root {
  --ig-bg-primary: 255 255 255;
  --ig-bg-secondary: 243 245 247;
  --ig-bg-elevated: 255 255 255;
  --ig-text-primary: 0 0 0;
  --ig-text-secondary: 115 115 115;
  --ig-text-tertiary: 199 199 199;
  --ig-icon-primary: 38 38 38;
  --ig-icon-secondary: 142 142 142;
  --ig-border-separator: 219 219 219;
  --ig-border-stroke: 219 219 219;
  --ig-action-primary: 74 93 249;
  --ig-action-primary-hover: 65 80 247;
  --ig-action-destructive: 237 73 86;
  --ig-status-badge: 255 48 64;
  --ig-status-live: 255 1 105;
  --ig-status-close-friends: 28 209 79;
  --ig-status-success: 88 195 34;

  --ig-space-1: 4px;
  --ig-space-2: 8px;
  --ig-space-3: 12px;
  --ig-space-4: 16px;
  --ig-space-5: 20px;
  --ig-space-6: 24px;
  --ig-space-8: 32px;

  --ig-radius-sm: 4px;
  --ig-radius-md: 8px;
  --ig-radius-lg: 12px;
  --ig-radius-xl: 16px;
  --ig-radius-sheet: 20px;
  --ig-radius-pill: 999px;

  --ig-motion-fast: 100ms;
  --ig-motion-short: 180ms;
  --ig-motion-standard: 260ms;
  --ig-ease-move: cubic-bezier(.17, .17, 0, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --ig-bg-primary: 12 16 20;
    --ig-bg-secondary: 37 41 46;
    --ig-bg-elevated: 33 35 40;
    --ig-text-primary: 245 245 245;
    --ig-text-secondary: 168 168 168;
    --ig-text-tertiary: 115 115 115;
    --ig-icon-primary: 245 245 245;
    --ig-icon-secondary: 142 142 142;
    --ig-border-separator: 38 38 38;
    --ig-border-stroke: 85 85 85;
  }
}
```

### 28.1 React Native semantic theme shape

```ts
type InstagramTheme = {
  dark: boolean;
  colors: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    backgroundElevated: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    iconPrimary: string;
    iconSecondary: string;
    separator: string;
    stroke: string;
    actionPrimary: string;
    actionPressed: string;
    destructive: string;
    success: string;
    closeFriends: string;
    live: string;
    onMedia: string;
  };
};
```

Prefer semantic tokens in components. Raw brand primitives belong only in the theme definition.

## 29. Component API contract

Every reusable component must define:

- Size variants.
- Visual variants.
- Light/dark/on-media colors.
- Default, hover, focus, pressed, selected, loading, disabled, and error states as applicable.
- Keyboard and screen-reader behavior.
- RTL behavior.
- Long-copy and large-text behavior.
- Compact, medium, and wide layout behavior.
- Test IDs only where semantic selectors are insufficient.

Suggested component inventory:

```text
Avatar, StoryAvatar, VerifiedBadge, StatusBadge
Icon, IconButton, Button, FollowButton, SegmentedControl, Chip, Switch
TextField, SearchField, MessageComposer
TopBar, BottomNavigation, SideNavigation, Tabs
PostHeader, FeedPost, MediaCarousel, PostActions, CaptionBlock
StoryTray, StoryViewer, StoryComposer
ReelViewer, ReelActionRail, AudioAttribution
ProfileHeader, HighlightsTray, ProfileGrid
CommentRow, CommentsPanel
InboxRow, ConversationHeader, MessageBubble, SharedContentCard
ListRow, SettingsSection, NotificationRow, FollowSuggestion
Menu, Popover, BottomSheet, Dialog, ActionMenu, Toast, Tooltip
Skeleton, EmptyState, ErrorState, OfflineBanner
```

## 30. Do / do not

### Do

- Let user media dominate.
- Keep chrome neutral and theme-aware.
- Reserve gradient for identity and expressive moments.
- Preserve stable navigation positions.
- Use filled icons for active navigation and selected social states.
- Keep actions accessible beyond their visible 24-unit icon.
- Design every loading, empty, offline, error, permission, and moderation state.
- Respect native back, safe area, text scaling, and reduced motion.

### Do not

- Do not use the Instagram gradient as a generic app background.
- Do not copy the script wordmark using a lookalike font.
- Do not mix legacy cyan-blue and current blue-violet as equal primaries.
- Do not put routine content into floating glass cards.
- Do not shrink icons below comfortable targets to fit more actions.
- Do not hide critical actions behind hover.
- Do not invent a cross-platform control that breaks iOS or Android conventions.
- Do not claim this reconstruction is official or complete internal documentation.

## 31. Review checklist

### Visual

- [ ] Content is the strongest visual signal.
- [ ] Only one primary accent action dominates each region.
- [ ] Neutral hierarchy remains clear in light and dark themes.
- [ ] Typography matches role scale; usernames and metadata are consistent.
- [ ] Icons share grid, weight, and active/inactive logic.
- [ ] Avatars, rings, badges, and verification align optically.
- [ ] Media preserves ratio with no layout shift.

### Interaction

- [ ] All icon actions meet target sizes.
- [ ] Hover, focus, pressed, loading, disabled, and selected states exist.
- [ ] Back/Escape/dismiss behavior is safe and predictable.
- [ ] Sheets, menus, and dialogs restore focus.
- [ ] Gestures have visible alternatives where accessibility requires them.

### Responsive

- [ ] Compact mobile uses top/bottom navigation appropriately.
- [ ] Medium web collapses side labels before compressing content.
- [ ] Wide web adds contextual space without stretching media.
- [ ] Keyboard and IME do not cover composers or focused fields.
- [ ] 200% web zoom and large native text remain operable.

### States

- [ ] Loading geometry matches final content.
- [ ] Empty first-use and empty-filtered states differ.
- [ ] Offline content remains useful where cached.
- [ ] Errors preserve work and provide recovery.
- [ ] Private, blocked, removed, and restricted states do not leak information.

## 32. Sources and provenance

Official public sources:

- [Meta: Built to celebrate creativity — the new Instagram brand identity (2026)](https://www.meta.com/design-at-meta/blog/the-new-instagram-brand-identity/)
- [Meta: Behind Instagram's brand evolution — movement, inclusivity and purpose (2022)](https://www.meta.com/design-at-meta/blog/behind-instagrams-brand-evolution-movement-inclusivity-and-a-new-purpose/)
- [Meta Brand Resource Center: Instagram brand assets and guidelines](https://www.meta.com/brand/resources/instagram/instagram-brand/)
- [Instagram on the Apple App Store](https://apps.apple.com/us/app/instagram/id389801252)
- [Instagram on Google Play](https://play.google.com/store/apps/details?id=com.instagram.android)
- [Meta: automatic alt text and photo descriptions](https://about.fb.com/news/2021/01/using-ai-to-improve-photo-descriptions-for-blind-and-visually-impaired-people/)

Observed measurements:

- Public Instagram web login at `https://www.instagram.com/`, inspected 2026-09-10.
- Current live CSS semantic variables from Instagram's public web bundle, inspected 2026-09-10.
- Observed web system stack, Optimistic input type, 14/18 control copy, 15/~19 input copy, 12/18 footer copy, 12 px input radius, 100 ms extra-short duration, and `cubic-bezier(.17,.17,0,1)` movement easing.

Reconstruction limits:

- Instagram performs experiments and staged rollouts; layout, labels, and components vary by region, account, device, accessibility setting, and build.
- Native internal tokens are not public. Dimensions marked reconstruction should be validated from the target iOS/Android release.
- Brand gradient, wordmark, fonts, and app icon must come from approved Meta assets when used outside internal prototyping.
