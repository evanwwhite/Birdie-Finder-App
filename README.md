# Birdie Finder iPhone app

The current route set presents approved catalog facts, an offline-first solo scorecard, private account rounds, and a synced bag of approved disc molds. The previous prototype screens are preserved in `demo_archive/` and are not imported into the app bundle. The source CSVs remain in `data/` for internal comparison; the public iOS export does not include them.

## Local development

1. In `../birdie_finder_backend/`, run `npm ci`, `npm run start`, and `npm run reset`. This creates only synthetic **local** test courses.
2. Copy `.env.example` to ignored `.env` and set the local public API URL and anon key. For a physical phone, use a reachable LAN host rather than `127.0.0.1`.
3. Run `npm ci` and `npx expo start` here. Open the solo scorecard while online once to cache the synthetic test layout, then turn connectivity off for the offline/restart smoke. Local synthetic data is fetched in development and is never hardcoded in a public build.

Production routes read `search_courses_v1`, `get_course_detail_v1`, and `search_disc_molds_v1`. Only reviewed, non-synthetic records are returned. A user can request nearby sorting; the app stores only a rounded nearby coordinate on the device. `birdie_catalog_v1.db` keeps up to 50 nearby/recent or explicitly saved playable details for offline use; unknown par and distances remain null. The scorecard's separate `birdie_rounds_v2.db` partitions rounds/outbox by signed-in UID or this device's anonymous namespace. Anonymous rounds upload only after the owner explicitly claims them from My rounds and account.

The old `bf_rounds_v1` and `bf_bag_v1` AsyncStorage keys are read-only. My rounds and account requires an explicit one-account claim before preview/import/export of those stores. Each old record receives a stable manifest UUID based on its device, position, and raw content. Unmatched records remain local and exportable; matched records use canonical course/disc crosswalks and server receipts to make retries idempotent. Account export includes server data and the claimed local legacy stores. Account deletion removes server data after confirmation; it does not silently delete old device stores.

## Verification

```sh
npm run typecheck
npx expo export --platform ios --output-dir /tmp/birdie-c-public-export
node scripts/check-public-export.mjs /tmp/birdie-c-public-export
```

The export checker rejects bundled legacy course, hole, or disc CSV assets. Device verification still requires a phone or simulator for offline kill/relaunch, cache access, cross-client refresh, legacy import, and account switching. Release gates and source rights are tracked in `../birdie_finder_backend/docs/RELEASE_RUNBOOK.md` and `../DATA_DESIGN_TODOS.md`.
