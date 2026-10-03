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

Plus: **Login** (Supabase email sign-in, account creation, and password recovery when configured).

## Architecture (per BUILD_PLAN)
- **Offline-first solo scorecard:** round snapshots, scores, and pending mutations commit together in SQLite
  (`birdie_rounds_v2.db`). The old AsyncStorage `bf_rounds_v1` key remains for the C4 importer; the bag still uses AsyncStorage.
- **One backend, two clients:** set `.env` from `.env.example` using the same local/test Supabase API URL and anon key as the web client. The authoritative migrations and RPCs are in `../birdie_finder_backend/`; `supabase/schema.sql` is reference material only.
- **Round sync:** UUID rounds and mutations replay creation before score writes. Owner-only RPCs return explicit revision conflicts. The internal synthetic courses are bundled for offline tests; general catalog caching is C3.
- **Provenance everywhere:** GPS vs IP location fix, OSM vs estimated hole data — never implied accuracy you don't have.

## Run it
```bash
npm install
npm install @expo-google-fonts/spectral @expo-google-fonts/archivo @expo-google-fonts/ibm-plex-mono expo-asset expo-file-system react-native-url-polyfill
cp .env.example .env   # optional: add Supabase creds
npx expo prebuild -p ios && npx expo run:ios   # or: npx expo start (Expo Go, maps limited)
```

## Seeding the backend
1. From `../birdie_finder_backend/`, run `npm run start` and `npm run reset` for the local synthetic catalog.
2. Put its API URL and anon key in this app's ignored `.env`. On a physical phone, use the computer's reachable LAN address instead of `127.0.0.1`.
3. Sign in before starting a round that should sync. Anonymous rounds remain on this device until the C4 claim flow exists.

## Deferred (per BUILD_PLAN §9)
Shop/commerce and event registration are intentionally out of scope for the app — ship the round loop and social first.
