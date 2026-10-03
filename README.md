# Birdie Finder iPhone app

Birdie Finder is an Expo/React Native app for finding reviewed disc golf courses, keeping a solo scorecard, and viewing saved rounds. It shares accounts, approved catalog data, rounds, and disc bag items with the [website](../birdie_finder_web/README.md) through the [Supabase backend](../birdie_finder_backend/README.md). The current product is a **solo** experience; group scoring, friends, reviews, commerce, and events in the older design plans are not current app features.

## What you can do

| Area | Current behavior |
| --- | --- |
| Home and Courses | Search approved courses by name or city, request nearby sorting, and inspect reviewed layouts, hole par, distance, attribution, and data version. Unknown facts stay unknown. |
| Play | Start, resume, and finish a solo round. Each score is saved to on-device SQLite first; signed-in rounds queue changes for sync when connected. A playable layout must be loaded while online before it can be used offline. |
| My rounds and account | View completed rounds, sign in or create an account, claim anonymous rounds explicitly, export account data, and delete an account after confirmation. |
| Disc catalog and bag | Browse approved disc molds and save copies to an account-backed bag. |
| Older device data | Explicitly claim, preview, import, or export records from the earlier `bf_rounds_v1` and `bf_bag_v1` stores. Unmatched records remain local and exportable. |

The tabs are Home, Courses, Play, and Stats ("My rounds and account"). The disc catalog, bag, course detail, login, and round summary open from those screens. A local backend reset seeds **synthetic test courses** for the development scorecard, but public course and disc searches intentionally exclude them. The public catalog can therefore look empty until a real source and its fields have been reviewed and published.

## Run locally

You need Node.js 20 or later, npm, a running Docker-compatible daemon for the local backend, and an iPhone or iOS simulator for device behavior. Xcode is needed for `npm run ios` on a simulator. Commands below assume this directory is `birdie_finder_app/` beside `birdie_finder_backend/`.

1. Start the shared backend from a terminal in `birdie_finder_backend/`:

   ```sh
   cd ../birdie_finder_backend
   npm ci
   npm run start
   npm run reset
   npx supabase status
   ```

   Copy the **API URL** and **anon/publishable key** from the status output. `npm run reset` recreates the local database and deletes local test data; it applies the backend migrations and synthetic seed. The backend is Supabase itself, not a separate Node server.

2. Configure the app from a terminal in `birdie_finder_app/`:

   ```sh
   cd ../birdie_finder_app
   test -f .env || cp .env.example .env
   npm ci
   ```

   If `.env` already exists, keep its values unless you are deliberately changing the backend. Otherwise fill in both values in the ignored `.env`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
   ```

   The shown URL is for a simulator on the same Mac. On a physical phone, replace `127.0.0.1` with a reachable LAN address for the computer running Supabase, and make sure the phone can reach that API. Expo public variables are embedded in the client; use only the anon/publishable key, never a service-role or secret key. Restart Expo after changing `.env`.

3. Start Expo:

   ```sh
   npm start
   ```

   This starts the development server on port **8002**. Open the app from the Expo terminal on an iOS simulator or a device. For a native iOS build on a configured Mac, use `npm run ios` instead.

4. Open **Play** while connected. The development build fetches the synthetic test layouts from the local backend. Start a round, enter scores, and finish it. To check offline behavior, load a layout while online, disconnect, score a round, close and reopen the app, then reconnect. Sign in to sync new rounds; rounds made anonymously stay on the device until you explicitly claim them from **My rounds and account**.

To test the same account in a browser, configure the [web client](../birdie_finder_web/README.md) for the same Supabase project and anon key. The browser can use `127.0.0.1` while a physical phone uses a LAN URL for that project. The local backend also provides Mailpit at `http://127.0.0.1:54324` for password recovery emails. Its Auth redirects include the app's `birdiefinder://login` scheme.

### If something looks wrong

- **Account or catalog connection unavailable:** Check that both `.env` values came from the running backend's `npx supabase status`, then restart Expo. On a physical phone, check LAN reachability; `127.0.0.1` points to the phone itself.
- **No courses in Courses:** This is expected with only the synthetic local seed. The development **Play** screen can use those fixtures, while the approved catalog needs reviewed real data.
- **No courses in Play while offline:** Open Play while online at least once to cache a playable layout before testing offline rounds.

## How it is organized

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens, tabs, login, course detail, scorecard, and summary. |
| `src/components/PublicCatalog.tsx` and `PublicAccount.tsx` | Approved catalog, account, bag, and legacy import UI. |
| `src/lib/soloCatalog.ts` | Public catalog reads and the SQLite cache of playable course details. |
| `src/state/round.ts` | Local round and score SQLite tables, owner namespaces, and the sync outbox. |
| `src/lib/legacyImport.ts` and `importAppLegacy.ts` | Preview and import of older on-device records. |
| `data/` and `demo_archive/` | Earlier source CSVs and prototype screens kept for comparison; they are not the source of the current public catalog. |

The app calls `search_courses_v1`, `get_course_detail_v1`, and `search_disc_molds_v1` for approved catalog reads. Signed-in solo rounds use `create_solo_round_v1`, `write_score_v1`, and `complete_round_v1`. SQLite stores scores and pending mutations together; the outbox retries them after reconnect. The backend's [version-one contract](../birdie_finder_backend/contracts/v1/README.md) defines the API and null-value behavior. The backend's `supabase/migrations/` is the only deployable schema source; `supabase/schema.sql` here is an older draft.

Location is optional. When a user requests nearby sorting, the app stores rounded coordinates on the device. The playable course cache (`birdie_catalog_v1.db`) keeps up to 50 nearby, recent, or explicitly saved details. Round data is kept separately in `birdie_rounds_v2.db` and partitioned by signed-in account or the device's anonymous namespace. Old AsyncStorage stores are read-only during migration; importing does not silently delete them.

## Verification and current limits

From `birdie_finder_app/`:

```sh
npm run typecheck
npx expo export --platform ios --output-dir /tmp/birdie-app-public-export
node scripts/check-public-export.mjs /tmp/birdie-app-public-export
```

The export check rejects bundled legacy course, hole, and disc CSV assets. These commands check types and the export; they do not prove offline restart, account switching, password recovery, or cross-client refresh on a real device. Use the [backend release runbook](../birdie_finder_backend/docs/RELEASE_RUNBOOK.md) and [data design checklist](../DATA_DESIGN_TODOS.md) for the remaining device, catalog-source, hosting, and release checks. Stop the local backend with `npm run stop` from `birdie_finder_backend/` when finished.
