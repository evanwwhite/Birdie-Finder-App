# Data sources & attribution

- `all_discs.csv` — full disc catalog (1,656 molds) seeded from the flight-number
  dataset shared with the web repo, refreshed at runtime (and via
  `scripts/seed_discs.mjs`) from the [DiscIt API](https://discit-api.fly.dev)
  (MIT-licensed, sourced nightly from the Marshall Street Flight Guide).
  DiscIt supplies fresher flight numbers plus flight-shape images (`pic`).
- `courses.csv` — original directory, cross-verified 2026-07-11 against
  [DiscGolfAPI](https://discgolfapi.com) (`https://io.discgolfapi.com/v1/courses`).
  336 hole counts and 241 coordinates corrected; `par` column filled where a full
  real layout is known. **Attribution required:** "Course data supplied by DiscGolfAPI."
- `course_holes.csv` — real per-hole par and length extracted from
  [OpenStreetMap](https://www.openstreetmap.org) (`disc_golf=hole` ways: `par` tags,
  lengths computed from way geometry). Covers 168 courses / 2,346 holes.
  © OpenStreetMap contributors, licensed [ODbL](https://opendatacommons.org/licenses/odbl/).
  Attribution must be shown in the app where this data is displayed.
  `scripts/enrich_course_holes.mjs` extends this file with OSM tee/basket
  coordinates, tee→basket distances for holes with no tagged length, and real
  per-hole elevation change from the free
  [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api)
  (same keyless model as the weather integration). The app also computes
  elevation at runtime from the stored coordinates when `elevFt` is absent.
- Course conditions: no free machine-readable source exists (UDisc keeps this
  proprietary; DiscGolfAPI publishes `condition_status` but it is currently
  `unknown` for all US courses). Left unset rather than guessed.
