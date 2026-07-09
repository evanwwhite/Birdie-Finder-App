# Handoff: Birdie Finder — iPhone App

## Overview
Birdie Finder is a disc-golf companion app. This handoff covers the **native iPhone app**, which re-imagines the existing desktop web app (`github.com/evanwwhite/Birdie-Finder`) around three phone-first principles: **thumb reach, one primary action per screen, and map-first for anything spatial.**

The package delivers seven interactive screens covering the full round loop — discover a course, play a live round, review the result, and track long-term stats — plus a disc-bag manager.

Two companion documents:
- **README.md** (this file) — the UI specification: screen-by-screen layout, components, exact tokens, interactions, and state.
- **BUILD_PLAN.md** — the architecture and phased engineering plan: recommended stack, the Supabase data model, the realtime shared-scorecard design, offline-first strategy, localStorage→server migration, and what to ship in what order.

Read BUILD_PLAN.md for *how to build the whole product*; read this file for *how each screen should look and behave*.

## About the Design Files
The file `Birdie Finder Mobile.dc.html` in this bundle is a **design reference created in HTML** — a working prototype that demonstrates the intended look, layout, and interactions. **It is not production code to copy directly.**

The task is to **recreate these designs in the target codebase's environment.** For a native iOS app the natural target is **SwiftUI** (or React Native / Expo if a cross-platform codebase is preferred — Expo is assumed in BUILD_PLAN.md because the existing web app is vanilla JS and a shared JS/TS backend is the cheapest path). Use the platform's established navigation, list, map, and gesture primitives rather than porting the HTML/CSS literally. Where the prototype uses Leaflet + CARTO tiles, use the platform-native map (MapKit on iOS, or `react-native-maps`).

The prototype is a **canvas of 7 phones side by side**. Open it and pan/zoom to inspect. Tab-bar items and in-screen buttons navigate between screens via anchor links; steppers, hole-swipe, the draggable bottom sheet, the live map, and disc removal are all functional.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, corner radii, and interaction behavior are all specified below and should be reproduced faithfully. Photography is shown as striped placeholders — production needs real course imagery (see Assets).

## Design System / Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| Paper | `#f5f0e6` | App background, on-dark text |
| Paper-2 (canvas) | `#e7e2d5` | Behind device frames only |
| Forest | `#1e3a2b` | Primary dark, hole card, tab-bar active, headings on light |
| Forest-2 | `#2f5c3f` | Secondary green, avatars, map markers fill |
| Moss | `#6b8c5a` | Progress "done", chart gradient top |
| Clay | `#c2703d` | Primary accent / CTA, pins, links |
| Clay-hover | `#ad6233` | CTA hover |
| Clay-deep | `#a8542a` | Double-bogey mark |
| Text | `#2a2318` | Body text |
| Text-strong | `#20180f` | Names, emphasized |
| Text-muted | `#8a8072` / `#6b6152` / `#7a7061` | Secondary text |
| Gold | `#a08a5f` | Eyebrows / mono labels |
| Birdie bg / fg | `#e8efdf` / `#3f7a4e` | Under-par (circle) |
| Bogey bg / fg | `#f6e7db` / `#c2703d` | +1 (square) |
| Double bg / fg | `#efc9b4` / `#a8542a` | +2 or worse (square) |
| Tint green | `#eef1e8` | Chip backgrounds |
| Tile bg | `#eae3d3` / `#f6f2e8` / `#faf7ef` | Inputs, list zebra |
| Card | `#ffffff` | Cards |
| Warn fg / bg | `#8a6d3b` / `#f6ead8` | "Estimated"/"weak fix" provenance |
| Border | `rgba(30,58,43,0.10)` | Card borders (0.07–0.14 range) |

### Typography
- **Spectral** (serif) — headings, hero numbers, scores, totals. Weights 600/700/800.
- **Archivo** (sans) — body, UI labels, buttons. Weights 400–800.
- **IBM Plex Mono** — eyebrows, metadata, stats labels, provenance badges, distances. Weights 400–600, often `letter-spacing: 0.04–0.16em; text-transform: uppercase`.

### Scale & shape
- Device screen: **388 × 840** (iPhone 14/15 logical ≈ 390×844). Corner radius 46px screen, dynamic island 118×33.
- Radii: cards 14–20px, pills/buttons 10–14px, chips 6–7px, full-round 999px.
- Tap targets: steppers **44×44**, pad buttons 80px tall, nothing interactive under 44px.
- Shadows: cards `0 8px 30px rgba(30,25,15,0.06)`; sheets `0 -12px 42px rgba(30,25,15,0.20)`; floating `0 8px 26px rgba(30,25,15,0.14)`.
- Standard screen gutter: **16px**.

### Score visual language (reused everywhere scores appear)
- **Birdie / under par** → number in a **green circle** (`#e8efdf`/`#3f7a4e`).
- **Bogey / +1** → number in a **clay square** (`#f6e7db`/`#c2703d`).
- **Double+ / ≥+2** → number in a **deep-clay square** (`#efc9b4`/`#a8542a`).
- Par → plain number, no chip.

### Data-provenance badges (a deliberate product value — keep it)
The app always states where data came from. Pill with a leading dot:
- `real` — green — "OSM layout" / surveyed hole rows (marked `●`).
- `est` — amber — "Estimated distance".
- Location fix: `ok` (green, "GPS · ±20ft") vs `weak` (amber, e.g. "IP-based"). Never imply pinpoint accuracy you don't have.

---

## Screens / Views

Navigation model: **tab bar** (Home · Courses · Play · Stats) persists on hub screens (Home, Stats). Courses, Play, Course-detail, Summary, and Bag are immersive/pushed views with a back affordance. Order in the prototype canvas: 01 Home → 02 Courses → 06 Course detail → 03 Play → 04 Summary → 05 Stats → 07 Bag.

### 01 · Home (`#home`)
- **Purpose:** Landing hub — resume an in-progress round, jump to core actions, see nearby courses and recent rounds.
- **Layout:** Vertical: status bar → app bar (wordmark left, avatar right) → scroll region → tab bar pinned bottom.
- **Components:**
  - **App bar:** circular disc-mark logo + "Birdie Finder" (Spectral 19/700, Forest). Avatar "EW" (36px clay circle) → Stats.
  - **Greeting:** "Good morning, Evan." (Spectral 25/800). Sub line in mono: weather one-liner.
  - **Resume card:** Forest `#1e3a2b`, radius 20, padding 17. Eyebrow "ROUND IN PROGRESS" (mono, moss), title "Pier Park · Blue" (Spectral 21), meta "Thru 8 · You −1 · 4 playing · saved offline". Clay "Resume ▸" button. Tapping → Play.
  - **Quick actions row:** 3 white tiles (Find courses / New round / My stats), each a 34px clay ring icon + label. → Courses / Play / Stats.
  - **"Courses near you"** section header + "View all →". Two course cards (see Course card spec in 02).
  - **"Recent rounds"** section header + "All rounds →". Two round rows: 42px striped thumb, course + date/holes, right-aligned total (Spectral 19) and relative-to-par (`under` green / `over` clay).

### 02 · Find courses (`#courses`)
- **Purpose:** Discover courses, map-first, sorted by distance from the user's location fix.
- **Layout:** Full-bleed map fills the screen; a **draggable bottom sheet** overlays it; a **location bar** is pinned at top; status bar overlays the map (light scrim/top fade).
- **Components:**
  - **Map:** light/paper-toned tiles. User position = clay dot with an accuracy circle; courses = Forest-filled circle markers; tapping a marker selects it and opens a popup (name, city, holes, distance).
  - **Location bar** (pinned, top:50): pin glyph + "Near **SE Portland, OR**" + provenance pill "GPS · ±20ft" (`ok`) + "Set" button. **The honesty of stating how the fix was obtained is a core feature — keep it.**
  - **Recenter** button (44px, floats above the sheet).
  - **Bottom sheet:** paper, radius 24 top, grab handle. Header: "Courses nearby" (Spectral 19) + "N within reach · sorted by distance"; **Filters** button with a count badge. List of **course cards**.
  - **Course card:** 54px striped thumb (course initial), name (Spectral 16), meta "City · N holes · par P", two chips (difficulty, terrain), right column distance (clay mono) + rating "★ 4.6". Selected state = clay border + ring.
  - **Filters sheet** (modal over screen): scrim + panel; grouped pill filters — Distance (functional single-select), Holes, Difficulty, Terrain; "Show N courses" applies and closes.
- **The filter rail from web collapses to a single Filters button opening a sheet — not a permanent sidebar.**

### 03 · Live scorecard (`#play`)
- **Purpose:** Score a round outdoors, one-handed, between throws. This is where the phone beats the web version.
- **Layout:** Vertical, fixed: status bar → app bar → 18-segment progress → full-bleed **hole card** → scrollable player list → footer nav. A live toast floats near the bottom.
- **Components:**
  - **App bar:** back "‹" → Home; course "Pier Park", sub "Blue · Par 60". **Live group pill:** pulsing green dot + overlapping avatars of the 4 players; the player currently "throwing" has an animated ring.
  - **Progress bar:** 18 segments; past = moss, current = clay, upcoming = tan.
  - **Hole card** (Forest, radius 24, `data-swipe`): "HOLE" eyebrow, giant hole number (Spectral 74/800), "Par 4", distance "395 ft · Blue tee → basket". Right: **GPS-to-basket** readout (big number + "ft" + "GPS TO BASKET" — a live value that decreases as you walk). Provenance pill ("OSM layout" / "Estimated distance") + "‹ swipe holes ›" hint. **Swipe left/right changes hole.**
  - **Player rows** (one per player): avatar, name, "Thru N · ±X" mono, relative-to-hole badge (birdie/bogey colored), **stepper** = 44px − button, Spectral score, 44px + button. Steppers are in the thumb zone. A teammate's incoming score briefly flashes the row.
  - **Footer:** "‹" prev, primary "Next hole →" (becomes "Finish round →" → Summary on hole 18), "›" next.
  - **Offline note:** "Offline · saved locally · screen stays awake · haptics on".

### 04 · Round summary (`#summary`)
- **Purpose:** Review a completed round; share it; save to profile.
- **Layout:** Status bar → app bar (back → Play) → scroll: header, winner chip, your-round stat cards, the full scorecard grid, legend, actions.
- **Components:**
  - **Header:** eyebrow "PIER PARK · BLUE LAYOUT · 18 HOLES", title "Nice round." (Spectral 30/800).
  - **Winner chip:** Forest pill, "★ You wins · −5".
  - **Stat cards (4):** Your score / vs par / Birdies / Pars.
  - **Scorecard grid** (horizontal scroll, sticky first column): header row 1–18 + Tot + ±; par row; one row per player. Cells use the **birdie-circle / bogey-square / double-square** language. Winning row highlighted clay.
  - **Legend:** Birdie ● / Bogey ▢ / Double+ ▢.
  - **Actions:** "Save to profile" (outline) + "Share round image ▸" (clay). Share = clean image export of the grid (see BUILD_PLAN "Shareable summaries").

### 05 · Stats & profile (`#stats`)
- **Purpose:** Long-term identity and performance; the social surface.
- **Layout:** Status bar → scroll (profile hero, stat strip, panels) → tab bar.
- **Components:**
  - **Profile hero** (Forest): 68px clay avatar "EW", name "Evan White", handle "@evanwhite · PDGA #182044", badges (rating / rounds / courses).
  - **Stat strip** (horizontal scroll): Rounds 129 · Avg 54.2 · Best −7 · Aces 3 · Courses 42.
  - **Player rating** panel: 8-bar trend chart (last 8 rounds), latest bar highlighted clay.
  - **This season** panel: 2×2 mini-grid — Circle 1 putting 61%, Circle 2 28%, Fairway hits 72%, Parked/GIR 48%, each with a "▲ x% vs 2025" delta.
  - **Recent rounds** panel: 4 rows (as on Home).
  - **Friends leaderboard** panel: ranked rows with avatars, rounds + course, rating; the user's own row highlighted clay. *(This is the payoff of the backend — see BUILD_PLAN.)*
  - **In the bag** panel: 8-disc grid preview; "Manage →" → Bag.

### 06 · Course detail (`#course`)
- **Purpose:** Everything about one course before you commit to playing it.
- **Layout:** Status bar → scroll: hero → stat bar → conditions → cards (about, hole-by-hole, reviews, details) → sticky actions.
- **Components:**
  - **Hero:** full-bleed course photo (placeholder), dark gradient, back "‹" → Courses, course name (Spectral 28/800) + location/distance, rating block "★ 4.6 / 128 reviews".
  - **Stat bar:** Holes 18 · Par 60 · 5,760 Feet · Difficulty.
  - **Conditions:** green "Good conditions today" badge + weather row (temp, sky, wind, rain 24h) — **live from a weather API, shown with graceful fallback.**
  - **About** card: description + amenity chips.
  - **Hole-by-hole** card: provenance badge "OSM + estimated"; table (Hole / Par / Dist / Elev / Difficulty bar). Surveyed rows show the par in green with a `●`; estimated rows plain. Attribution line credits OpenStreetMap.
  - **Reviews** card: big 4.6, category bars (Scenery/Upkeep/Signage/Difficulty), individual reviews (avatar, name, meta, stars, body).
  - **Details** card: Type/Tees/Baskets/Hours/Est. round; Open-Meteo attribution.
  - **Sticky actions:** "Start a scorecard ▸" (clay) → Play; "Get directions" (outline).

### 07 · In the bag (`#bag`)
- **Purpose:** Manage your discs, tied to the disc catalog.
- **Layout:** Status bar → app bar (back → Stats, sub "N discs · avg speed X") → scroll: summary stats, grouped disc list, add button.
- **Components:**
  - **Summary stats:** Discs / Avg speed / Categories.
  - **Grouped list:** sections Distance drivers / Fairway drivers / Midranges / Putters & approach, each with a count. Disc row: colored circle (speed number), name, brand (mono), four flight boxes **SPD/GLD/TRN/FAD**, and a **✕ remove** button (updates counts live).
  - **"+ Add a disc"** dashed button → opens the disc catalog.

---

## Interactions & Behavior
- **Steppers:** ± adjusts a player's score for the current hole, clamped 1–12; fires haptic feedback on each tap.
- **Hole navigation:** swipe left/right on the hole card, or use footer arrows; last hole's primary CTA becomes "Finish round →".
- **Bottom sheet:** drag the grab handle; snaps to three heights (peek / half / full). Below-content is the map.
- **Map:** pan/zoom; tap a marker to select + popup; recenter button re-frames on the nearest courses + your position.
- **Filters:** open as a modal sheet; distance filter re-sorts/filters the list; "Show N" applies.
- **Realtime group (simulated in prototype):** the "throwing" indicator rotates and teammates' scores update on their own with a toast — this stands in for the live multi-device round (see BUILD_PLAN).
- **Bag:** remove a disc updates the list + summary immediately; add opens the catalog.
- **Transitions:** view transitions ~250ms, `cubic-bezier(0.19, 1, 0.22, 1)`. Respect `prefers-reduced-motion`.
- **Tab bar / anchors** navigate between screens.

## State Management (prototype → app)
Prototype state (in the DC logic class) maps to app state as:
- `scores[player][hole]`, `cur` (current hole), `throwing`, per-row `flash` → **live round state** (belongs on the server + local cache; see realtime section).
- `sheetH`, `filtersOpen`, `dist`, `selC` → **Courses screen view state** (local/UI only).
- `bag` → **user's bag** (server table `bags`).
- Toast text/visibility → transient UI.
- Provenance/GPS/live-sim flags → feature toggles.

## Assets
- **Fonts:** Spectral, Archivo, IBM Plex Mono (Google Fonts). Bundle for offline.
- **Map tiles:** prototype uses CARTO "light_all" over OpenStreetMap. Production iOS → MapKit; RN → `react-native-maps` / MapTiler. Keep OSM/CARTO attribution if you use their tiles.
- **Course & disc photography:** placeholders only — needs real imagery (course seed data has none; source per-course or use a house style).
- **Icons:** drawn with CSS primitives (rings, squares) — replace with the codebase's icon set (SF Symbols on iOS).
- **Disc catalog + course directory:** `data/all_discs.csv` and `data/courses.csv` in the source repo seed the catalog (see BUILD_PLAN "Seed data").

## Files
- `Birdie Finder Mobile.dc.html` — the 7-screen interactive prototype (design reference).
- `support.js` — runtime required to open the prototype locally (fonts/Leaflet load from CDN, so opening it needs internet).
- `BUILD_PLAN.md` — architecture, data model, and phased engineering plan.
- `screenshots/` — static captures of the screens (if included).

> Source web app for parity + seed data: `github.com/evanwwhite/Birdie-Finder` (vanilla HTML/CSS/JS; `assets/styles.css` is the token source of truth this design matches).
