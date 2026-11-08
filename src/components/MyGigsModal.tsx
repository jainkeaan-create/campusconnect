import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Loader as Loader2,
  Inbox,
  FileText,
  CircleCheck as CheckCircle2,
  Circle as XCircle,
  Clock,
  Download,
  Inbox as InboxIcon,
  Briefcase,
  Banknote,
  ShieldCheck,
  Store,
  AlertCircle,
} from 'lucide-react';
import {
  supabase,
  fetchBadgeCounts,
  generateDemoTxnId,
  type Gig,
  type Application,
  type BadgeCounts,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import VerifiedBadge from '@/components/VerifiedBadge';

type MyGigsModalProps = {
  open: boolean;
  onClose: () => void;
};

type ApplicationWithGig = Application & {
  applicant_name?: string;
};

type GigWithApplications = Gig & { applications: ApplicationWithGig[] };

const STATUS_META: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string; dot: string }
> = {
  submitted: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  declined: {
    label: 'Declined',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
};

type ReleaseStage = 'idle' | 'confirming' | 'processing' | 'success' | 'error';

export default function MyGigsModal({ open, onClose }: MyGigsModalProps) {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<GigWithApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);

  // Completion + escrow release state
  const [confirmGigId, setConfirmGigId] = useState<string | null>(null);
  const [releaseGig, setReleaseGig] = useState<GigWithApplications | null>(null);
  const [releaseStage, setReleaseStage] = useState<ReleaseStage>('idle');
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseTxnId, setReleaseTxnId] = useState('');
  const [busyGigId, setBusyGigId] = useState<string | null>(null);

  // Badge counts for the signed-in user (hirer) and applicant seller badges
  const [myBadges, setMyBadges] = useState<BadgeCounts>({ hirer: 0, seller: 0 });
  const [sellerBadges, setSellerBadges] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: myGigs, error: gigError } = await supabase
      .from('gigs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (gigError) {
      setError(gigError.message);
      setLoading(false);
      return;
    }

    const gigList = (myGigs ?? []) as Gig[];
    if (gigList.length === 0) {
      setGigs([]);
      setLoading(false);
      return;
    }

    const gigIds = gigList.map((g) => g.id);
    const { data: apps, error: appError } = await supabase
      .from('applications')
      .select('*')
      .in('gig_id', gigIds)
      .order('created_at', { ascending: false });

    if (appError) {
      setError(appError.message);
      setLoading(false);
      return;
    }

    const appsByGig: Record<string, ApplicationWithGig[]> = {};
    for (const a of (apps ?? []) as Application[]) {
      (appsByGig[a.gig_id] ??= []).push(a);
    }

    const merged = gigList.map((g) => ({
      ...g,
      applications: appsByGig[g.id] ?? [],
    }));

    setGigs(merged);

    // Load my hirer/seller badge counts
    fetchBadgeCounts(user.id).then(setMyBadges);

    // Load seller badge counts for all accepted applicants
    const acceptedApplicantIds = Array.from(
      new Set(
        (apps ?? [])
          .filter((a) => (a as Application).status === 'accepted')
          .map((a) => (a as Application).user_id),
      ),
    );
    if (acceptedApplicantIds.length > 0) {
      const { data: sellerCounts } = await supabase
        .from('seller_release_counts')
        .select('user_id, released_count')
        .in('user_id', acceptedApplicantIds);
      const map: Record<string, number> = {};
      for (const row of (sellerCounts ?? []) as { user_id: string; released_count: number }[]) {
        map[row.user_id] = row.released_count;
      }
      setSellerBadges(map);
    } else {
      setSellerBadges({});
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) {
      load();
      setExpandedId(null);
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (releaseStage === 'processing') return;
        if (confirmGigId) {
          setConfirmGigId(null);
          return;
        }
        if (releaseGig) {
          setReleaseGig(null);
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, releaseStage, confirmGigId, releaseGig]);

  if (!open) return null;

  const updateApplicationStatus = async (appId: string, status: 'accepted' | 'declined') => {
    setBusyAppId(appId);
    const { error: updateError } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', appId);

    setBusyAppId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setGigs((prev) =>
      prev.map((g) => ({
        ...g,
        applications: g.applications.map((a) =>
          a.id === appId ? { ...a, status } : a,
        ),
      })),
    );
  };

  const handleMarkCompleted = async () => {
    if (!confirmGigId) return;
    setBusyGigId(confirmGigId);
    const { error: updateError } = await supabase
      .from('gigs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', confirmGigId);

    setBusyGigId(null);
    if (updateError) {
      setError(updateError.message);
      setConfirmGigId(null);
      return;
    }
    setGigs((prev) =>
      prev.map((g) =>
        g.id === confirmGigId
          ? { ...g, status: 'completed', completed_at: new Date().toISOString() }
          : g,
      ),
    );
    setConfirmGigId(null);
  };

  const startEscrowRelease = (gig: GigWithApplications) => {
    const accepted = gig.applications.find((a) => a.status === 'accepted');
    if (!accepted) {
      setReleaseError('No accepted applicant to release payment to.');
      setReleaseGig(gig);
      setReleaseStage('error');
      return;
    }
    if (gig.payment_status === 'released') {
      setReleaseError('Payment has already been released for this gig.');
      setReleaseGig(gig);
      setReleaseStage('error');
      return;
    }
    setReleaseError(null);
    setReleaseGig(gig);
    setReleaseStage('confirming');
  };

  const runEscrowRelease = async () => {
    if (!releaseGig || !user) return;
    const accepted = releaseGig.applications.find((a) => a.status === 'accepted');
    if (!accepted) {
      setReleaseError('No accepted applicant found.');
      setReleaseStage('error');
      return;
    }

    setReleaseStage('processing');
    setReleaseError(null);
    const txnId = generateDemoTxnId();

    // Atomic-ish: update gig payment_status to released AND insert escrow record.
    // The UNIQUE constraint on escrow_releases.gig_id guarantees single release.
    const { error: gigUpdateError } = await supabase
      .from('gigs')
      .update({ payment_status: 'released' })
      .eq('id', releaseGig.id)
      .eq('payment_status', 'pending');

    if (gigUpdateError) {
      setReleaseError(gigUpdateError.message);
      setReleaseStage('error');
      return;
    }

    const { error: releaseError2 } = await supabase
      .from('escrow_releases')
      .insert({
        gig_id: releaseGig.id,
        hirer_id: user.id,
        seller_id: accepted.user_id,
        amount: releaseGig.payment,
        txn_id: txnId,
      });

    if (releaseError2) {
      // Attempt to roll back the gig payment_status so it can be retried.
      await supabase
        .from('gigs')
        .update({ payment_status: 'pending' })
        .eq('id', releaseGig.id);
      setReleaseError(
        releaseError2.code === '23505'
          ? 'Payment was already released for this gig.'
          : releaseError2.message,
      );
      setReleaseStage('error');
      return;
    }

    setReleaseTxnId(txnId);
    setReleaseStage('success');

    // Update local state
    setGigs((prev) =>
      prev.map((g) =>
        g.id === releaseGig.id ? { ...g, payment_status: 'released' } : g,
      ),
    );

    // Refresh badge counts for both hirer (me) and seller (the applicant)
    fetchBadgeCounts(user.id).then(setMyBadges);
    setSellerBadges((prev) => ({
      ...prev,
      [accepted.user_id]: (prev[accepted.user_id] ?? 0) + 1,
    }));
  };

  const closeRelease = () => {
    setReleaseGig(null);
    setReleaseStage('idle');
    setReleaseError(null);
    setReleaseTxnId('');
  };

  const totalApplications = gigs.reduce((sum, g) => sum + g.applications.length, 0);
  const acceptedCount = gigs.reduce(
    (sum, g) => sum + g.applications.filter((a) => a.status === 'accepted').length,
    0,
  );
  const completedCount = gigs.filter((g) => g.status === 'completed').length;
  const releasedCount = gigs.filter((g) => g.payment_status === 'released').length;

  const confirmGig = gigs.find((g) => g.id === confirmGigId) ?? null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center p-0 sm:p-4 sm:py-8">
        <div className="relative w-full max-w-3xl animate-[slideUp_0.25s_ease-out] rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-7">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">My posted gigs</h2>
              <p className="text-xs text-slate-500">
                Review applications, mark gigs completed, and release demo escrow payments.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 py-6 sm:px-7">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="mt-3 text-sm font-medium">Loading your gigs…</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
                <p className="font-semibold text-rose-700">Couldn't load your gigs</p>
                <p className="mt-1 text-sm text-rose-600">{error}</p>
                <button
                  onClick={load}
                  className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
                >
                  Try again
                </button>
              </div>
            ) : gigs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <InboxIcon className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">You haven't posted any gigs yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Post a gig and the applications you receive will show up here.
                </p>
              </div>
            ) : (
              <>
                {/* Summary + badges */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <SummaryPill
                    icon={<Briefcase className="h-4 w-4" />}
                    label="Gigs posted"
                    value={gigs.length}
                    tone="slate"
                  />
                  <SummaryPill
                    icon={<FileText className="h-4 w-4" />}
                    label="Applications"
                    value={totalApplications}
                    tone="sky"
                  />
                  <SummaryPill
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Completed"
                    value={completedCount}
                    tone="emerald"
                  />
                  {myBadges.hirer > 0 && (
                    <VerifiedBadge kind="hirer" count={myBadges.hirer} size="md" />
                  )}
                  {myBadges.seller > 0 && (
                    <VerifiedBadge kind="seller" count={myBadges.seller} size="md" />
                  )}
                </div>

                <div className="space-y-3">
                  {gigs.map((gig) => {
                    const expanded = expandedId === gig.id;
                    const pending = gig.applications.filter((a) => a.status === 'submitted').length;
                    const accepted = gig.applications.filter((a) => a.status === 'accepted').length;
                    const hasAccepted = accepted > 0;
                    const isCompleted = gig.status === 'completed';
                    const isReleased = gig.payment_status === 'released';
                    return (
                      <div
                        key={gig.id}
                        className={`overflow-hidden rounded-xl border transition hover:border-slate-300 ${
                          isReleased
                            ? 'border-emerald-300 bg-emerald-50/30'
                            : isCompleted
                              ? 'border-sky-200 bg-sky-50/20'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <button
                          onClick={() => setExpandedId(expanded ? null : gig.id)}
                          className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-[15px] font-bold text-slate-900">
                                {gig.title}
                              </h3>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                                  isReleased
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : isCompleted
                                      ? 'bg-sky-50 text-sky-700 ring-sky-200'
                                      : gig.status === 'open'
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                                }`}
                              >
                                {isReleased
                                  ? 'Paid'
                                  : isCompleted
                                    ? 'Completed'
                                    : gig.status === 'open'
                                      ? 'Open'
                                      : 'Closed'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                              <span className="text-emerald-700">{gig.payment_display}</span>
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {gig.applications.length} application{gig.applications.length === 1 ? '' : 's'}
                              </span>
                              {accepted > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {accepted} accepted
                                </span>
                              )}
                              {pending > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                                  <Clock className="h-3.5 w-3.5" />
                                  {pending} pending
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-emerald-600">
                            {expanded ? 'Hide' : 'View'}
                          </span>
                        </button>

                        {expanded && (
                          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                            {/* Completion + escrow action bar */}
                            {hasAccepted && !isReleased && (
                              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800">
                                      {isCompleted ? 'Release demo escrow payment' : 'Mark gig as completed'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {isCompleted
                                        ? `Release ${gig.payment_display} to the accepted student. Demo only — no real money moves.`
                                        : 'Confirm the work is done, then release the demo escrow payment.'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      isCompleted
                                        ? startEscrowRelease(gig)
                                        : setConfirmGigId(gig.id)
                                    }
                                    disabled={busyGigId === gig.id}
                                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
                                      isCompleted
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-slate-800 hover:bg-slate-700'
                                    }`}
                                  >
                                    {busyGigId === gig.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isCompleted ? (
                                      <Banknote className="h-4 w-4" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    {isCompleted ? 'Release payment' : 'Mark as Completed'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {isReleased && (
                              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-sm font-bold text-emerald-800">
                                    Demo escrow payment released
                                  </p>
                                  <p className="text-xs text-emerald-700">
                                    The accepted student has been paid {gig.payment_display}. This was a demo transaction.
                                  </p>
                                </div>
                              </div>
                            )}

                            {gig.applications.length === 0 ? (
                              <div className="flex flex-col items-center py-8 text-center">
                                <Inbox className="h-8 w-8 text-slate-300" />
                                <p className="mt-2 text-sm font-semibold text-slate-600">
                                  No applications yet
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  When students apply, they'll appear here for you to review.
                                </p>
                              </div>
                            ) : (
                              <ul className="space-y-3">
                                {gig.applications.map((app) => (
                                  <ApplicationRow
                                    key={app.id}
                                    app={app}
                                    gig={gig}
                                    busy={busyAppId === app.id}
                                    sellerReleaseCount={sellerBadges[app.user_id]}
                                    onAccept={() => updateApplicationStatus(app.id, 'accepted')}
                                    onDecline={() => updateApplicationStatus(app.id, 'declined')}
                                  />
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mark-as-completed confirmation popup */}
      {confirmGig && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setConfirmGigId(null)}
          />
          <div className="relative w-full max-w-md animate-[slideUp_0.25s_ease-out] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
                <CheckCircle2 className="h-7 w-7 text-sky-600" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">Mark gig as completed?</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                You're about to mark <span className="font-bold text-slate-800">"{confirmGig.title}"</span> as
                completed. This closes the gig and lets you release the demo escrow payment to the
                accepted student.
              </p>
              <div className="mt-6 flex w-full gap-3">
                <button
                  onClick={() => setConfirmGigId(null)}
                  className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkCompleted}
                  disabled={busyGigId === confirmGig.id}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {busyGigId === confirmGig.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escrow release flow */}
      {releaseGig && (
        <EscrowReleaseModal
          gig={releaseGig}
          stage={releaseStage}
          error={releaseError}
          txnId={releaseTxnId}
          onConfirm={runEscrowRelease}
          onClose={closeRelease}
        />
      )}
    </div>
  );
}

function EscrowReleaseModal({
  gig,
  stage,
  error,
  txnId,
  onConfirm,
  onClose,
}: {
  gig: GigWithApplications;
  stage: ReleaseStage;
  error: string | null;
  txnId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const accepted = gig.applications.find((a) => a.status === 'accepted');
  const amount = gig.payment_display;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={stage === 'processing' ? undefined : onClose}
      />
      <div className="relative w-full max-w-md animate-[slideUp_0.25s_ease-out] rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {stage === 'success'
                ? 'Payment released'
                : stage === 'error'
                  ? 'Payment failed'
                  : stage === 'processing'
                    ? 'Releasing payment…'
                    : 'Release demo escrow'}
            </h2>
            <p className="text-xs text-slate-500">
              {stage === 'success'
                ? 'Demo transaction complete'
                : 'Demo escrow release · no real money'}
            </p>
          </div>
          {stage !== 'processing' && (
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-6">
          {/* Demo banner */}
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-800">DEMO TRANSACTION</p>
              <p className="text-xs text-amber-700">
                No actual money will be transferred. This simulates releasing escrow to the student.
              </p>
            </div>
          </div>

          {stage === 'confirming' && (
            <div>
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Gig</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{gig.title}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Payment to release</span>
                  <span className="font-extrabold text-emerald-700">{amount}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Recipient</span>
                  <span className="font-semibold text-slate-800">Accepted student</span>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Confirm to release the demo escrow payment. This can only be done once per gig.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Banknote className="h-4 w-4" />
                  Release {amount}
                </button>
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
                <Loader2 className="h-8 w-8 animate-pulse text-emerald-600" />
              </div>
              <h3 className="mt-6 text-lg font-extrabold text-slate-900">Releasing demo escrow…</h3>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500">
                Simulating payment transfer of {amount} to the accepted student. Please wait.
              </p>
              <div className="mt-5 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                <Banknote className="h-3.5 w-3.5" />
                Demo transaction in progress
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-xl font-extrabold text-slate-900">Demo payment released!</h3>
              <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                The demo escrow of {amount} has been released to the student who completed this gig.
              </p>

              <div className="mt-5 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-bold text-slate-800">{txnId}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-600">Released</span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-800">{amount}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-slate-500">Type</span>
                  <span className="font-bold text-amber-600">Demo</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-6 flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Done
              </button>
            </div>
          )}

          {stage === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <AlertCircle className="h-7 w-7 text-rose-600" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">Payment release failed</h3>
              <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                {error ?? 'Something went wrong while releasing the demo escrow payment.'}
              </p>
              <button
                onClick={onClose}
                className="mt-6 flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({
  app,
  gig,
  busy,
  sellerReleaseCount,
  onAccept,
  onDecline,
}: {
  app: ApplicationWithGig;
  gig: Gig;
  busy: boolean;
  sellerReleaseCount?: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const meta = STATUS_META[app.status] ?? STATUS_META.submitted;
  const StatusIcon = meta.icon;
  const submittedDate = new Date(app.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  const isPaidSeller = gig.payment_status === 'released' && app.status === 'accepted';

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {app.user_id.charAt(0).toUpperCase()}
            </div>
            <p className="truncate text-sm font-bold text-slate-900">Applicant</p>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${meta.className}`}
            >
              <StatusIcon className="h-3 w-3" />
              {meta.label}
            </span>
            {sellerReleaseCount !== undefined && sellerReleaseCount > 0 && (
              <VerifiedBadge kind="seller" count={sellerReleaseCount} />
            )}
            {isPaidSeller && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Banknote className="h-3 w-3" />
                Paid
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Applied {submittedDate}</p>
          {app.cover_note && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600">
              "{app.cover_note}"
            </p>
          )}
          {app.resume_name && (
            <a
              href={app.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 transition hover:text-emerald-700"
            >
              <Download className="h-3.5 w-3.5" />
              {app.resume_name}
            </a>
          )}
        </div>
      </div>

      {app.status === 'submitted' && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onAccept}
            disabled={busy}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Accept
          </button>
          <button
            onClick={onDecline}
            disabled={busy}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Decline
          </button>
        </div>
      )}
    </li>
  );
}

function SummaryPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'slate' | 'sky' | 'emerald';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  };
  return (
    <div className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-inset ${tones[tone]}`}>
      {icon}
      {value} {label}
    </div>
  );
}
