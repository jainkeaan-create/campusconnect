/*
# Gig completion & demo escrow release

Adds the schema support for marking a gig as completed and for a
simulated (demo) escrow payment release from the gig poster to the
student who was accepted for the gig. Also introduces computed counts
that power the "Verified Hirer" and "Verified Seller" badges.

## Changes

### 1. `gigs` table — completion + payment status
- `payment_status` (text, default 'pending') — 'pending' until the
  poster releases demo escrow, then 'released'. Constrained to those
  two values so only valid states are stored.
- `completed_at` (timestamptz, nullable) — set when the poster marks
  the gig as completed. Null means the gig is still open/in progress.

### 2. New table: `escrow_releases`
Records a single demo escrow release event per gig, so payment can
only be released once per completed gig (enforced by a UNIQUE
constraint on gig_id).
- `id` (uuid, primary key)
- `gig_id` (uuid, FK -> gigs, cascade delete) — the gig paid out
- `hirer_id` (uuid, FK -> auth.users) — the poster who paid
- `seller_id` (uuid, FK -> auth.users) — the student who received
  payment (the accepted applicant)
- `amount` (numeric, not null) — amount released, copied from the gig
- `txn_id` (text, not null) — demo transaction id for display
- `released_at` (timestamptz, default now())

### 3. Security
- Grant UPDATE on `gigs` to `authenticated` (already granted by an
  earlier migration, restated for safety). The existing
  `update_own_gigs` policy scopes updates to the gig's owner, which
  is exactly who should mark completion / trigger release.
- Enable RLS on `escrow_releases`. Grant SELECT to `authenticated`
  (so the hirer and seller can both see release records) and INSERT
  to `authenticated`. SELECT policy: the hirer or the seller of the
  release. INSERT policy: only the gig's owner (hirer) can insert a
  release for their own gig, and only when that gig has an accepted
  applicant (the seller) — enforced by the WITH CHECK.

### 4. Views for badges
- `hirer_release_counts` — one row per gig poster with at least one
  released payment, showing the count of released gigs. Drives the
  "Verified Hirer" badge.
- `seller_release_counts` — one row per accepted applicant whose gig
  had a released payment, showing the count of gigs they completed and
  were paid for. Drives the "Verified Seller" badge.
Both views are `security_invoker` so RLS on the underlying tables
applies, and SELECT is granted to `authenticated`.

## Important notes
1. A gig can only have ONE escrow release (UNIQUE on gig_id). The app
   checks `payment_status = 'released'` before allowing another.
2. `completed_at` is set when the poster marks the gig completed;
   `payment_status` flips to 'released' when the demo escrow is
   released. These are separate steps in the UI.
3. All payments are explicitly demo/simulated — no real money moves.
*/

-- 1. Add columns to gigs
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending','released'));

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 2. escrow_releases table
CREATE TABLE IF NOT EXISTS escrow_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  hirer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  txn_id text NOT NULL,
  released_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gig_id)
);

ALTER TABLE escrow_releases ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON escrow_releases TO authenticated;

DROP POLICY IF EXISTS "select_escrow_releases" ON escrow_releases;
CREATE POLICY "select_escrow_releases"
ON escrow_releases FOR SELECT
TO authenticated USING (
  auth.uid() = hirer_id OR auth.uid() = seller_id
);

DROP POLICY IF EXISTS "insert_escrow_release" ON escrow_releases;
CREATE POLICY "insert_escrow_release"
ON escrow_releases FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = hirer_id
  AND EXISTS (
    SELECT 1 FROM gigs g
    WHERE g.id = escrow_releases.gig_id
      AND g.user_id = auth.uid()
      AND g.payment_status = 'pending'
  )
  AND EXISTS (
    SELECT 1 FROM applications a
    WHERE a.gig_id = escrow_releases.gig_id
      AND a.user_id = escrow_releases.seller_id
      AND a.status = 'accepted'
  )
);

-- 3. Badge count views
CREATE OR REPLACE VIEW hirer_release_counts AS
SELECT
  hirer_id AS user_id,
  COUNT(*)::int AS released_count
FROM escrow_releases
GROUP BY hirer_id;

CREATE OR REPLACE VIEW seller_release_counts AS
SELECT
  seller_id AS user_id,
  COUNT(*)::int AS released_count
FROM escrow_releases
GROUP BY seller_id;

GRANT SELECT ON hirer_release_counts TO authenticated;
GRANT SELECT ON seller_release_counts TO authenticated;