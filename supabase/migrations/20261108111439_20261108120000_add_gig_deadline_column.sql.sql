/*
# Add deadline column to gigs

Adds an optional deadline date to each gig so posters can communicate
when the work needs to be completed by.

## Changes

### 1. `gigs` table — new column
- `deadline` (date, nullable) — the date by which the gig work should be
  finished. Existing seeded gigs get NULL (no deadline). Posters can set
  a deadline when creating a gig; it's optional.

## Important notes
1. The column is nullable — posters are not forced to set a deadline.
2. No new policies or grants needed; the existing gig policies already
   cover SELECT/INSERT/UPDATE/DELETE on the gigs table.
*/

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS deadline date;
