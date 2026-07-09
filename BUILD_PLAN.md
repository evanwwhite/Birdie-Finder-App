# Build Plan: Birdie Finder

This is the engineering plan to take the seven prototype screens (see `README.md`) to a shipped product. It synthesizes the product direction: **ship the round loop and social first; defer commerce and events.**

---

## 1. The core problem to solve
Today the web app is **per-device**: everything lives in `localStorage` and reads static CSVs / public APIs on load. Nothing is shared between users. Every feature that involves another person — friends, leaderboards, a group scorecard, visible reviews — needs **accounts and a server**. That server is the spine of the whole product.

## 2. Recommended architecture
**One backend, two clients.** The existing web app and the new iPhone app both talk to a single **Supabase** project — same auth, same Postgres, same realtime. A user's rounds, bag, friends, and profile are identical whether they open the website or the app, and any two users are linked the moment they follow each other or share a card.

- **iPhone app:** **Expo (React Native)** is the recommended target. Rationale: the existing web app is vanilla JS, the backend is JS/TS, and Expo lets you share types and the Supabase client across web + mobile with the least duplication. (Native **SwiftUI** is a valid alternative if the team is iOS-native; the UI spec is framework-agnostic. If SwiftUI, use `supabase-swift`.)
- **Backend:** **Supabase** — chosen because it provides the three missing pieces in one place:
  1. **Postgres** (the Build Spec already targets Postgres),
  2. **Auth** including **Apple Sign In** (the web `login.html` already stubbed the Apple button),
  3. **Realtime** subscriptions — and it drops into vanilla JS with a `<script>` tag, so the current web app adopts it without a rewrite.
- **Maps:** MapKit (SwiftUI) or `react-native-maps` (Expo). Keep the "location fix provenance" UX.
- **Weather:** Open-Meteo (already used) for course conditions.
- **Course/hole data:** OpenStreetMap for surveyed hole layouts; estimate the rest. Preserve the provenance badges.

## 3. Data model (Supabase / Postgres)
The existing `localStorage` keys become tables. Enable **Row Level Security** on all of them.

```
profiles      id (uuid, = auth.uid), handle, name, pdga_number,
              home_lat, home_lng, rating, avatar_url, created_at

courses       id, name, city, state, zip, lat, lng, holes, par,
              rating, difficulty, terrain[], amenities[], source
              -- seeded once from courses.csv (see §8)

course_holes  id, course_id -> courses, hole, par, distance_ft,
              elevation_ft, source ('osm' | 'estimated')

rounds        id, user_id -> profiles, course_id -> courses, layout,
              played_at, total, rel_par, hole_count, status
              -- ('live' | 'complete')

hole_scores   id, round_id -> rounds, player_id -> profiles (nullable
              for guests), guest_name, hole, par, strokes
              -- bf_rounds_v1 lives here; one row per player per hole

round_players id, round_id -> rounds, player_id (nullable), guest_name,
              position   -- who is on a given card (incl. guests)

bags          id, user_id -> profiles, disc_id -> discs, plastic,
              color, category
discs         id, name, manufacturer, primary_use, speed, glide,
              turn, fade, ...   -- seeded once from all_discs.csv

follows       follower_id -> profiles, followee_id -> profiles
              -- THIS is what enables friends + leaderboards

reviews       id, user_id -> profiles, course_id -> courses, rating,
              categories jsonb, body, created_at
```

Once there is a shared `rounds` table keyed to accounts, the linking features fall out almost for free:
- **Friends leaderboard** = query over `follows` joined to `rounds` (filter by month, order by rating).
- **Player profile** = that user's `rounds` + aggregates.
- **Reviews** = visible to everyone via `courses` join.

## 4. The feature that justifies the backend: realtime shared scorecard
Instead of one phone tracking the whole group (how casual rounds work today), **each player joins the same round on their own phone and scores only themselves.**

- A round has a `round_id`; everyone in the group subscribes to a Supabase **realtime channel** for it.
- Each stroke is an `INSERT`/`UPDATE` on `hole_scores`, pushed to the channel; the live card updates on all four phones at once.
- `round_players` tracks who's in; guests (no account) are allowed as name-only rows so mixed groups work.
- This is the moment the app stops being a solo tool and becomes something a foursome uses together — the single biggest reason someone tells friends to download it.

In the prototype, this is *simulated* (the rotating "throwing" indicator + teammates' scores updating with a toast). Replace the simulation with a real channel subscription; the UI (avatars, flash-on-update, live pill) is already built for it.

## 5. Offline-first (non-negotiable for disc golf)
Courses are often in cellular dead zones, and the OSM/weather fetches already have to fail gracefully — so you're halfway there.
- **Live round writes go to a local store first** (SQLite / WatermelonDB in Expo; SwiftData/Core Data in SwiftUI), then sync to Supabase when signal returns. A round must be fully playable and resumable with zero connectivity.
- Cache the course directory and the user's bag locally; the CSV stays as an **offline fallback**, matching the current graceful-degradation pattern.
- **Resume:** a `status='live'` round rehydrates if the app is backgrounded/killed mid-round (drives the Home "Resume round" card).
- Keep the **screen awake** during a live round; **haptics** on each stepper tap.

## 6. Auth & migration
- Email + **Apple Sign In** (Apple button already stubbed on web).
- On a user's **first login, migrate their `localStorage`** (`bf_rounds_v1`, bag, saved location) up to their new account so nobody loses saved rounds. Do this once, idempotently, from both web and app.

## 7. Shareable summaries
The Round Summary grid should export as a **clean image** (the birdie/bogey grid + winner) for sharing. Expo: `react-native-view-shot`; SwiftUI: `ImageRenderer`. This is a growth loop — every shared card is an ad.

## 8. Seed data
- `courses.csv` (~795 KB) → seed the `courses` table **once**, so every client stops parsing 795 KB on load and queries the server instead (CSV kept as offline fallback).
- Derive `course_holes` from OSM where available (mark `source='osm'`), estimate the rest (`source='estimated'`) — this feeds the provenance badges.
- `all_discs.csv` → seed the `discs` catalog once (powers Bag + Add-a-disc).

## 9. Phased roadmap
Grouped by how core each piece is.

**Phase 1 — Round loop (MVP).** Auth + profiles; course directory (Courses + Course detail, map-first, provenance); live scorecard **solo**, offline-first, resumable; round summary + save; basic stats. *Everything a single player needs, end to end.*

**Phase 2 — The link (the real work).** Supabase realtime **shared scorecard** (4 phones, one `round_id`); follows; friends leaderboard; player profiles; shareable summary images. *This is what makes it sticky.*

**Phase 3 — Disc-golf depth.** In-the-bag manager (done in design); personal course log ("played 42 courses"); post-round stats flowing into the profile (rating trend, C1/C2 putting, fairway hits); course reviews written from the phone; course conditions/check-ins (Open-Meteo already feeds this); GPS distance-to-basket from live position to the OSM pin.

**Deferred (explicitly).** The **shop/commerce** flow and **event registration**. Both need real payment/organizer infrastructure, and neither is why someone opens a disc-golf app mid-round. Ship the round loop and social first.

## 10. Definition of done for Phase 1
- A logged-in user can find a course near them, see accurate distance + honest fix provenance, start and finish a round with no connectivity, resume it after a crash, and see a saved summary that shows up in their stats — all matching the hifi screens in README.md.

---
*Screen-level visual + interaction spec: see `README.md`. Token source of truth matched by the design: `assets/styles.css` in `github.com/evanwwhite/Birdie-Finder`.*
