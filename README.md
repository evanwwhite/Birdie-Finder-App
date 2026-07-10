# Birdie Finder — iPhone App (Expo / React Native)

Native iPhone app for Birdie Finder, built from the handoff spec (README UI spec + BUILD_PLAN)
and matching the web app's design system exactly (paper / forest / clay tokens, Spectral +
Archivo + IBM Plex Mono, birdie-circle / bogey-square score language, provenance badges).

## Screens (all 7 from the spec)
1. **Home** — greeting + live weather line, Resume-round card, quick actions, courses near you, recent rounds.
2. **Find courses** — full-bleed map (react-native-maps), clay user dot + accuracy circle, forest markers,
   draggable 3-snap bottom sheet, distance-sorted list, filters modal (distance / holes / difficulty / terrain),
   location-fix provenance pill, recenter.
3. **Live scorecard** — 18-segment progress, forest hole card with giant hole number + live **GPS-to-basket**,
   swipe-to-change-hole, 44×44 haptic steppers (you score yourself), live group pill with the throwing ring,
   teammate score flash + toast (real Supabase realtime when configured, simulated otherwise), screen kept awake,
   "Finish round →" on the last hole.
4. **Round summary** — winner chip, 4 stat cards, horizontally scrolling scorecard grid with sticky name column
   and the birdie/bogey/double visual language, legend, Save to profile, **Share round image** (view-shot export).
5. **Stats & profile** — forest hero, stat strip, 8-bar rating trend, season 2×2 grid, recent rounds,
   friends leaderboard (your row highlighted clay), in-the-bag preview.
6. **Course detail** — hero, stat bar, live Open-Meteo conditions with graceful offline fallback, about + amenities,
   hole-by-hole table with OSM ● / estimated provenance and OSM attribution, reviews with category bars, details,
   sticky "Start a scorecard ▸" + Directions (opens Apple Maps).
7. **In the bag** — grouped by category, flight-number boxes (SPD/GLD/TRN/FAD), live remove, "+ Add a disc"
   → searchable disc catalog seeded from `all_discs.csv`.

Plus: **Login** (email + Apple Sign In via Supabase; demo mode until configured).

## Architecture (per BUILD_PLAN)
- **Offline-first:** all round + bag state persists to AsyncStorage (`bf_rounds_v1`, `bf_bag_v1`) via zustand/persist;
  a live round survives kill/relaunch and drives the Home Resume card. Courses + discs load from bundled CSVs
  (PapaParse) as the offline fallback.
- **One backend, two clients:** `src/lib/supabase.ts` is the shared client. Set `.env` from `.env.example` to enable
  auth + realtime; `supabase/schema.sql` creates the full data model with RLS and realtime on `hole_scores`.
- **Realtime shared scorecard:** each player scores only themselves; strokes upsert to `hole_scores` and broadcast
  on `round:{id}`. Unconfigured builds run the prototype's simulation so the UI is fully exercised.
- **Provenance everywhere:** GPS vs IP location fix, OSM vs estimated hole data — never implied accuracy you don't have.

## Run it
```bash
npm install
npm install @expo-google-fonts/spectral @expo-google-fonts/archivo @expo-google-fonts/ibm-plex-mono expo-asset expo-file-system react-native-url-polyfill
cp .env.example .env   # optional: add Supabase creds
npx expo prebuild -p ios && npx expo run:ios   # or: npx expo start (Expo Go, maps limited)
```

## Seeding the backend
1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Import the full `data/courses.csv` and `data/all_discs.csv` from the web repo into `courses` / `discs`
   (the bundled CSVs here are a working subset; swap in the repo's full files for production).
3. Enable Apple Sign In under Supabase Auth providers.

## Deferred (per BUILD_PLAN §9)
Shop/commerce and event registration are intentionally out of scope for the app — ship the round loop and social first.
