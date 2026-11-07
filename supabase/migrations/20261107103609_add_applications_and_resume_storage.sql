/*
# Add applications table, gig ownership, and resume storage

Extends the gig marketplace so students can authenticate, post gigs,
and apply to gigs with a resume upload.

## Changes

### 1. `gigs` table — add ownership
- Add `user_id uuid` column referencing `auth.users` (nullable so existing
  seeded gigs remain visible). New gigs posted by authenticated students
  get the poster's id via `DEFAULT auth.uid()`.
- Add policies so authenticated users can INSERT (post) and UPDATE/DELETE
  their own gigs. SELECT remains open to anon + authenticated.

### 2. New table: `applications`
- `id` (uuid, primary key)
- `gig_id` (uuid, FK -> gigs, cascade delete)
- `user_id` (uuid, FK -> auth.users, defaults to authenticated user)
- `resume_url` (text, not null) — public URL of uploaded resume in storage
- `resume_name` (text) — original file name for display
- `cover_note` (text, optional) — short message from applicant
- `status` (text, default 'submitted')
- `created_at` (timestamptz, default now())
- UNIQUE constraint on (gig_id, user_id) so a student can apply to a
  given gig only once.

### 3. Security on `applications`
- Enable RLS.
- Grant SELECT, INSERT to `authenticated` only.
- SELECT: a user can see their own applications (to pin them and check
  status). A gig poster can also see applications to their own gigs.
- INSERT: only the authenticated user, for themselves.

### 4. Storage bucket: `resumes`
- Public bucket for resume PDFs.
- Policies: authenticated users can upload to a private folder path
  `resumes/<user_id>/...`, and anyone can read (so gig posters can view
  applicants' resumes).

## Important notes
1. Existing seeded gigs keep `user_id = null` — they are community/seed
   gigs and remain visible to all.
2. The `gigs.user_id` column is nullable so the ALTER does not break
   existing rows.
*/

-- 1. Add user_id to gigs
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE gigs ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Allow authenticated users to post gigs and manage their own
GRANT INSERT, UPDATE, DELETE ON gigs TO authenticated;

DROP POLICY IF EXISTS "insert_own_gigs" ON gigs;
CREATE POLICY "insert_own_gigs"
ON gigs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_gigs" ON gigs;
CREATE POLICY "update_own_gigs"
ON gigs FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_gigs" ON gigs;
CREATE POLICY "delete_own_gigs"
ON gigs FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- 2. applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_url text NOT NULL,
  resume_name text,
  cover_note text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gig_id, user_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON applications TO authenticated;

-- A user can see their own applications OR applications to gigs they posted
DROP POLICY IF EXISTS "select_applications" ON applications;
CREATE POLICY "select_applications"
ON applications FOR SELECT
TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM gigs g WHERE g.id = applications.gig_id AND g.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_own_application" ON applications;
CREATE POLICY "insert_own_application"
ON applications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload to their own folder, public read
DROP POLICY IF EXISTS "auth_upload_resumes" ON storage.objects;
CREATE POLICY "auth_upload_resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "public_read_resumes" ON storage.objects;
CREATE POLICY "public_read_resumes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');
