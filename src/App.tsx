import { useEffect, useMemo, useState } from 'react';
import { Loader as Loader2, Briefcase, Sparkles, ShieldCheck, Pin, CircleCheck as CheckCircle2 } from 'lucide-react';
import { supabase, type Gig, type Application } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import TagFilter from '@/components/TagFilter';
import GigCard from '@/components/GigCard';
import GigDetail from '@/components/GigDetail';
import AuthModal from '@/components/AuthModal';
import PostGigModal from '@/components/PostGigModal';
import MyGigsModal from '@/components/MyGigsModal';

const FEATURED_TAGS = [
  'Coding',
  'Graphic Design',
  'Tutoring',
  'Content Writing',
  'Video Editing',
  'Web Development',
  'Photography',
  'Data Entry',
  'Music',
  'Translation',
];

export default function App() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  // Modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [postGigOpen, setPostGigOpen] = useState(false);
  const [myGigsOpen, setMyGigsOpen] = useState(false);
  // Remember what the user was trying to do before auth interrupted
  const [pendingAction, setPendingAction] = useState<null | 'apply' | 'post'>(null);

  // Fetch gigs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('gigs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setGigs((data ?? []) as Gig[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the signed-in user's applications (for pinning + status)
  useEffect(() => {
    if (!user) {
      setApplications([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id);
      if (!cancelled) {
        setApplications((data ?? []) as Application[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const appliedGigIds = useMemo(
    () => new Set(applications.map((a) => a.gig_id)),
    [applications],
  );

  const acceptedGigIds = useMemo(
    () => new Set(applications.filter((a) => a.status === 'accepted').map((a) => a.gig_id)),
    [applications],
  );

  const declinedGigIds = useMemo(
    () => new Set(applications.filter((a) => a.status === 'declined').map((a) => a.gig_id)),
    [applications],
  );

  const applicationForGig = useMemo(() => {
    const map: Record<string, Application> = {};
    for (const a of applications) map[a.gig_id] = a;
    return map;
  }, [applications]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of gigs) {
      for (const t of g.tags) {
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    return counts;
  }, [gigs]);

  // Filter, then pin applied gigs to the top
  const { pinnedGigs, otherGigs, filteredGigs } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = gigs.filter((g) => {
      const matchesTag = !activeTag || g.tags.includes(activeTag);
      const matchesSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesSearch;
    });
    const pinned = filtered.filter((g) => appliedGigIds.has(g.id));
    const others = filtered.filter((g) => !appliedGigIds.has(g.id));
    return { pinnedGigs: pinned, otherGigs: others, filteredGigs: filtered };
  }, [gigs, activeTag, searchQuery, appliedGigIds]);

  // Handlers
  const handleSignIn = () => {
    setAuthMode('signin');
    setAuthOpen(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setAuthOpen(true);
  };

  const handleRequestPostGig = () => {
    if (!user) {
      setPendingAction('post');
      setAuthMode('signup');
      setAuthOpen(true);
    } else {
      setPostGigOpen(true);
    }
  };

  const handleRequestAuth = () => {
    setPendingAction('apply');
    setAuthMode('signin');
    setAuthOpen(true);
  };

  const handleRequestMyGigs = () => {
    if (!user) {
      setAuthMode('signin');
      setAuthOpen(true);
    } else {
      setMyGigsOpen(true);
    }
  };

  const handleAuthed = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'post') {
      setPostGigOpen(true);
    }
    // For 'apply', the GigDetail is still open and will now show the upload form
    // because `user` is populated.
  };

  const handleGigPosted = (gig: Gig) => {
    setGigs((prev) => [gig, ...prev]);
  };

  const handleApplied = (gigId: string, application: Application) => {
    setApplications((prev) =>
      prev.some((a) => a.gig_id === gigId) ? prev : [...prev, application],
    );
    // Optimistically bump the proposals count on the local gig
    setGigs((prev) =>
      prev.map((g) =>
        g.id === gigId ? { ...g, proposals_count: g.proposals_count + 1 } : g,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onPostGig={handleRequestPostGig}
        onSignIn={handleSignIn}
        onMyGigs={handleRequestMyGigs}
      />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            IIT Madras students only
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[40px] sm:leading-[1.15]">
            Find and post gigs on CampusConnect
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
            Browse paid projects, tutoring requests, design work, and more — all from the IIT
            Madras campus community. Sign in with your student email to apply or post.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              {gigs.length} open gigs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified IITM community
            </span>
          </div>
        </div>
      </section>

      {/* Tag filter */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <TagFilter
            tags={FEATURED_TAGS}
            activeTag={activeTag}
            onTagChange={setActiveTag}
            counts={tagCounts}
          />
        </div>
      </div>

      {/* Gig list */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="mt-3 text-sm font-medium">Loading gigs…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="font-semibold text-rose-700">Couldn't load gigs</p>
            <p className="mt-1 text-sm text-rose-600">{error}</p>
          </div>
        ) : filteredGigs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No gigs match your search</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different keyword or clear the tag filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTag(null);
              }}
              className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pinned (applied) gigs */}
            {pinnedGigs.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Pin className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                    Gigs you applied to
                  </h2>
                  <span className="text-sm font-medium text-slate-400">
                    {pinnedGigs.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pinnedGigs.map((gig) => (
                    <GigCard
                      key={gig.id}
                      gig={gig}
                      onClick={() => setSelectedGig(gig)}
                      applied
                      pinned
                      accepted={acceptedGigIds.has(gig.id)}
                      declined={declinedGigIds.has(gig.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All other gigs */}
            <div>
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {activeTag ? `${activeTag} gigs` : 'All open gigs'}
                </h2>
                <span className="text-sm font-medium text-slate-400">
                  {otherGigs.length} result{otherGigs.length === 1 ? '' : 's'}
                </span>
              </div>
              {otherGigs.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No more gigs in this filter.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {otherGigs.map((gig) => (
                    <GigCard
                      key={gig.id}
                      gig={gig}
                      onClick={() => setSelectedGig(gig)}
                      applied={appliedGigIds.has(gig.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm text-slate-400">
            CampusConnect · A student-to-student gig marketplace for the IIT Madras community
          </p>
        </div>
      </footer>

      {selectedGig && (
        <GigDetail
          gig={selectedGig}
          onClose={() => setSelectedGig(null)}
          onRequestAuth={handleRequestAuth}
          onApplied={handleApplied}
          existingApplication={applicationForGig[selectedGig.id] ?? null}
        />
      )}

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingAction(null);
        }}
        initialMode={authMode}
        onAuthed={handleAuthed}
      />

      <PostGigModal
        open={postGigOpen}
        onClose={() => setPostGigOpen(false)}
        onPosted={handleGigPosted}
      />

      <MyGigsModal
        open={myGigsOpen}
        onClose={() => setMyGigsOpen(false)}
      />
    </div>
  );
}
