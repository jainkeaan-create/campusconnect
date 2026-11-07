/*
# Create gigs table for IIT Madras student marketplace

This is a browse-only student-facing view of a gig marketplace.
No sign-in is required to view gigs, so this is a single-tenant
(no-auth) schema: policies use `TO anon, authenticated` and
`USING (true)` because all gigs are intentionally public/shared.

1. New Tables
- `gigs`
  - `id` (uuid, primary key)
  - `title` (text, not null) — short gig headline shown on cards
  - `description` (text, not null) — basic one-line description for the card
  - `details` (text, not null) — full multi-paragraph description shown on detail view
  - `payment` (numeric, not null) — amount paid in INR
  - `payment_type` (text, not null) — 'fixed' or 'hourly'
  - `payment_display` (text) — optional formatted label e.g. "₹2,000 fixed price"
  - `tags` (text[], not null) — category tags e.g. {'Coding','Python'}
  - `posted_by_name` (text, not null) — name of the student posting the gig
  - `posted_by_initial` (text, not null) — single letter avatar
  - `posted_by_color` (text, not null) — tailwind color class for avatar
  - `experience_level` (text, not null) — 'Beginner', 'Intermediate', 'Expert'
  - `duration` (text, not null) — e.g. "Less than 1 week"
  - `location` (text, not null) — e.g. "On campus", "Remote"
  - `proposals_count` (integer, default 0) — number of applicants so far
  - `status` (text, default 'open') — 'open' or 'closed'
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `gigs`.
- Grant SELECT to `anon` + `authenticated` (browse-only student view).
- Allow anon + authenticated SELECT because gigs are intentionally public.

3. Seed Data
- Inserts 14 sample gigs across categories: Coding, Graphic Design,
  Tutoring, Content Writing, Data Entry, Video Editing, Web Development,
  Photography, Music, Translation, Research.
*/

CREATE TABLE IF NOT EXISTS gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  details text NOT NULL,
  payment numeric NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('fixed','hourly')),
  payment_display text,
  tags text[] NOT NULL DEFAULT '{}',
  posted_by_name text NOT NULL,
  posted_by_initial text NOT NULL,
  posted_by_color text NOT NULL,
  experience_level text NOT NULL,
  duration text NOT NULL,
  location text NOT NULL,
  proposals_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON gigs TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_gigs" ON gigs;
CREATE POLICY "anon_select_gigs"
ON gigs FOR SELECT
TO anon, authenticated USING (true);

-- Seed data: sample gigs for IIT Madras students
INSERT INTO gigs (title, description, details, payment, payment_type, payment_display, tags, posted_by_name, posted_by_initial, posted_by_color, experience_level, duration, location, proposals_count) VALUES
(
  'Build a Python script to scrape hostel mess menus',
  'Need a Python script that scrapes the weekly mess menu from the institute website and exports it as a clean PDF.',
  'I need someone to write a Python script that scrapes the weekly hostel mess menu from the IITM dining portal and exports it as a nicely formatted PDF. The script should run daily, handle menu changes, and flag items that contain common allergens. You should use BeautifulSoup or Selenium. Bonus if you can set it up to run automatically via a cron job and email the PDF to subscribers. Familiarity with web scraping and PDF generation libraries (like reportlab or fpdf) is expected.',
  1500, 'fixed', '₹1,500 fixed price', ARRAY['Coding','Python','Web Scraping'], 'Arjun Mehta', 'A', 'bg-emerald-500', 'Intermediate', 'Less than 1 week', 'Remote', 4
),
(
  'Design a logo for my tech-fest startup stall',
  'Looking for a clean, modern logo for a campus startup showcase. Need 3 concepts and final SVG.',
  'We are presenting our campus startup at Shaastra and need a professional logo for our stall. I am looking for a clean, modern, minimal logo that communicates innovation and trust. Please provide 3 initial concepts, revisions on the chosen one, and the final deliverable as an SVG plus PNG in multiple sizes. Include a simple brand color palette suggestion. Portfolio of previous logo work required.',
  2500, 'fixed', '₹2,500 fixed price', ARRAY['Graphic Design','Logo','Branding'], 'Sneha Reddy', 'S', 'bg-rose-500', 'Intermediate', '1 to 2 weeks', 'Remote', 7
),
(
  'Tutor me for CS2810 Data Structures exam',
  'Need 5 two-hour tutoring sessions covering trees, graphs, DP, and sorting algorithms before end-sem.',
  'I am a second-year student struggling with CS2810 Data Structures and Algorithms. I need 5 two-hour in-person tutoring sessions on campus covering binary trees, graphs, dynamic programming, and sorting algorithms before the end-semester exam. You should have taken this course and scored an A or A+. Sessions will be on weekends or evenings. Please bring your own notes and practice problems.',
  400, 'hourly', '₹400/hr · 10 hrs', ARRAY['Tutoring','DSA','Algorithms'], 'Karthik Iyer', 'K', 'bg-blue-500', 'Expert', '2 to 3 weeks', 'On campus', 2
),
(
  'Write 5 SEO blog posts about campus entrepreneurship',
  'Need 5 well-researched, 800-word blog posts on student entrepreneurship for our institute newsletter.',
  'We run the IITM entrepreneurship cell newsletter and need 5 well-researched blog posts (around 800 words each) about campus entrepreneurship, startup funding, and student founders. Tone should be engaging and inspiring, aimed at undergrads. We will provide topic briefs and interview notes. Strong English writing skills and some prior blogging experience required. Please share writing samples.',
  3000, 'fixed', '₹3,000 fixed price', ARRAY['Content Writing','Blogging','SEO'], 'Priya Nair', 'P', 'bg-amber-500', 'Intermediate', '1 to 2 weeks', 'Remote', 3
),
(
  'Develop a React dashboard for hostel room allocation',
  'Build a responsive React dashboard to manage and visualize hostel room allocations.',
  'We need a responsive React + TypeScript dashboard to manage hostel room allocations for the upcoming semester. Features include: room grid view, search/filter by hostel block, drag-and-drop room assignment, occupancy stats charts, and CSV export. We will provide the API endpoints. Experience with React, Tailwind CSS, and a charting library (recharts or chart.js) is required. Clean code and component organization matter to us.',
  6000, 'fixed', '₹6,000 fixed price', ARRAY['Coding','Web Development','React'], 'Rohit Sharma', 'R', 'bg-cyan-500', 'Expert', '3 to 4 weeks', 'Remote', 5
),
(
  'Edit a 3-minute promo video for our cultural fest',
  'Need someone to edit raw footage of Saarang into a high-energy 3-minute promo with transitions and music.',
  'We have about 40 minutes of raw footage from last year''s Saarang cultural fest and need it edited into a high-energy 3-minute promotional video. The edit should include smooth transitions, color grading, synced background music (we will provide the track), and text overlays for event names. Deliver the final MP4 in 1080p plus a vertical 9:16 version for Instagram reels. Experience with Premiere Pro or DaVinci Resolve required.',
  3500, 'fixed', '₹3,500 fixed price', ARRAY['Video Editing','Premiere Pro','Promo'], 'Ananya Krishnan', 'A', 'bg-purple-500', 'Intermediate', '1 to 2 weeks', 'Remote', 6
),
(
  'Create a poster series for department symposium',
  'Design 6 event posters for our EE department symposium, consistent visual theme.',
  'Our Electrical Engineering department symposium needs 6 event posters (workshops, talks, competitions) with a consistent visual theme. We have a rough brand guide and color preferences. Each poster is A3 portrait, print-ready PDF plus social media square versions. Looking for a designer who can balance professionalism with student-friendly energy. Share your poster portfolio.',
  4000, 'fixed', '₹4,000 fixed price', ARRAY['Graphic Design','Poster','Print'], 'Vikram Singh', 'V', 'bg-teal-500', 'Intermediate', '1 to 2 weeks', 'Remote', 8
),
(
  'Take product photos for my campus baked-goods startup',
  'Need 15 styled product photos of cookies and brownies for Instagram and packaging.',
  'I run a small campus baked-goods startup and need 15 styled product photos of our cookies, brownies, and cakes for Instagram and packaging inserts. You should have your own DSLR or good mirrorless camera and basic lighting. Shoots will be in my hostel room or a common area. Please deliver edited high-res JPEGs and a few Instagram-ready square crops. Food photography experience a big plus.',
  2000, 'fixed', '₹2,000 fixed price', ARRAY['Photography','Product','Social Media'], 'Divya Patel', 'D', 'bg-pink-500', 'Beginner', 'Less than 1 week', 'On campus', 3
),
(
  'Translate a research abstract from English to Tamil',
  'Need an accurate Tamil translation of a 400-word CS research abstract for a state-level conference.',
  'I am presenting a computer science research paper at a state-level conference and need an accurate Tamil translation of my 400-word abstract. The language is technical but the translation should be accessible to a general Tamil-speaking academic audience. Native or fluent Tamil proficiency required, and some familiarity with CS terminology is a big plus. Quick turnaround needed.',
  800, 'fixed', '₹800 fixed price', ARRAY['Translation','Tamil','Research'], 'Lakshmi Narayanan', 'L', 'bg-indigo-500', 'Intermediate', 'Less than 1 week', 'Remote', 1
),
(
  'Build a Flutter app for campus lost-and-found',
  'Develop a simple Flutter app to post and browse lost & found items across campus.',
  'We want a simple cross-platform Flutter app for campus lost-and-found. Users can post a lost or found item with a photo, description, location, and contact. Other users browse by category and location. Need basic auth (Google sign-in), Firebase backend, and push notifications when a matching item is posted. Clean, simple UI. No complex features needed for v1.',
  8000, 'fixed', '₹8,000 fixed price', ARRAY['Coding','Mobile App','Flutter'], 'Aditya Verma', 'A', 'bg-orange-500', 'Expert', '3 to 4 weeks', 'Remote', 9
),
(
  'Data entry: organize 500 student club survey responses',
  'Clean and organize 500 messy survey responses into a structured Google Sheet.',
  'We collected about 500 student club interest survey responses in a messy Google Form export. We need someone to clean, deduplicate, normalize department and year fields, tag interests into our category list, and deliver a tidy Google Sheet with proper headers and a summary pivot table. Attention to detail is critical. Should be a quick job for someone organized.',
  1200, 'fixed', '₹1,200 fixed price', ARRAY['Data Entry','Spreadsheets','Cleanup'], 'Meera Joshi', 'M', 'bg-lime-600', 'Beginner', 'Less than 1 week', 'Remote', 5
),
(
  'Compose a background score for a short student film',
  'Need a 6-minute original background score for a drama short film, royalty-free.',
  'Our student film club is finishing a 6-minute drama short and needs an original background score. The score should shift between tense, emotional, and hopeful moods across three scenes. We will provide the locked edit with a temp track for reference. Deliver high-quality WAV stems plus a final mixed stereo track. All music must be original and royalty-free. Share a portfolio of previous composition work.',
  5000, 'fixed', '₹5,000 fixed price', ARRAY['Music','Composition','Sound'], 'Harish Kumar', 'H', 'bg-fuchsia-500', 'Expert', '2 to 3 weeks', 'Remote', 2
),
(
  'Help with MATLAB simulations for my BTP project',
  'Need 3 sessions of help debugging MATLAB signal processing simulations for my BTP.',
  'I am working on my B.Tech project involving signal processing simulations in MATLAB and I am stuck on filter design and FFT analysis. I need 3 one-hour sessions (in person or screen-share) with someone who is comfortable with MATLAB signal processing toolbox. Please help me debug my existing scripts, explain the concepts, and suggest improvements. Graduate students or strong seniors preferred.',
  600, 'hourly', '₹600/hr · 3 hrs', ARRAY['Tutoring','MATLAB','Signal Processing'], 'Sanjay Gupta', 'S', 'bg-red-500', 'Expert', 'Less than 1 week', 'On campus', 0
),
(
  'Design a one-page website for my campus photography portfolio',
  'Need a clean, responsive one-page portfolio site with a gallery grid and contact form.',
  'I am a campus photographer and need a clean, responsive one-page portfolio website. Sections: hero with my name, a filterable gallery grid (portraits, events, landscapes), an about section, and a working contact form. I will provide all photos. Looking for a modern, minimal design with subtle hover animations. Deliver via Vercel or Netlify so I can share the link. Share previous web design work.',
  4500, 'fixed', '₹4,500 fixed price', ARRAY['Web Development','Portfolio','Design'], 'Ishaan Kapoor', 'I', 'bg-sky-500', 'Intermediate', '1 to 2 weeks', 'Remote', 4
);
