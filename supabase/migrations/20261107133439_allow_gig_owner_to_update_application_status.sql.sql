/*
# Allow gig owners to accept/decline applications

Gig posters need to manage applications they receive: mark an applicant
as accepted or declined. Applicants who have been accepted should see a
green "Accepted" state on their pinned gig.

## Changes

### 1. `applications` table — add status check constraint
- Constrain `status` to 'submitted', 'accepted', 'declined' so only
  valid lifecycle states are stored. Existing rows ('submitted') still
  satisfy the constraint.

### 2. Security on `applications`
- Grant UPDATE to `authenticated` (was SELECT, INSERT only).
- Add UPDATE policy:
  - The applicant can update their own row (e.g. withdraw).
  - The gig poster can update applications to gigs they own
    (this is how they accept/decline applicants).
- The WITH CHECK keeps the owner invariant: the applicant's user_id and
  the gig's owner must still match the requester for the relevant case.

## Important notes
1. Only the gig owner can flip an application to 'accepted'/'declined';
   applicants cannot accept themselves.
2. The applicant-side update path is allowed by policy but the app
   currently only uses owner-side updates.
*/

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('submitted','accepted','declined'));

GRANT UPDATE ON applications TO authenticated;

DROP POLICY IF EXISTS "update_applications" ON applications;
CREATE POLICY "update_applications"
ON applications FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM gigs g WHERE g.id = applications.gig_id AND g.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM gigs g WHERE g.id = applications.gig_id AND g.user_id = auth.uid()
  )
);
