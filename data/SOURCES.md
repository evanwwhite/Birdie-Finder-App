# Data sources & attribution

- `courses.csv` — original directory, cross-verified 2026-07-11 against
  [DiscGolfAPI](https://discgolfapi.com) (`https://io.discgolfapi.com/v1/courses`).
  336 hole counts and 241 coordinates corrected; `par` column filled where a full
  real layout is known. **Attribution required:** "Course data supplied by DiscGolfAPI."
- `course_holes.csv` — real per-hole par and length extracted from
  [OpenStreetMap](https://www.openstreetmap.org) (`disc_golf=hole` ways: `par` tags,
  lengths computed from way geometry). Covers 168 courses / 2,346 holes.
  © OpenStreetMap contributors, licensed [ODbL](https://opendatacommons.org/licenses/odbl/).
  Attribution must be shown in the app where this data is displayed.
- Course conditions: no free machine-readable source exists (UDisc keeps this
  proprietary; DiscGolfAPI publishes `condition_status` but it is currently
  `unknown` for all US courses). Left unset rather than guessed.
