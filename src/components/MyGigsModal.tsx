import { useEffect, useState, useCallback } from 'react';
import { X, Loader as Loader2, Inbox, FileText, CircleCheck as CheckCircle2, Circle as XCircle, Clock, Download, Inbox as InboxIcon, Briefcase } from 'lucide-react';
import { supabase, type Gig, type Application } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type MyGigsModalProps = {
  open: boolean;
  onClose: () => void;
};

type GigWithApplications = Gig & { applications: ApplicationWithGig[] };

type ApplicationWithGig = Application & {
  applicant_name?: string;
};

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

export default function MyGigsModal({ open, onClose }: MyGigsModalProps) {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<GigWithApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);

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
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

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

  const totalApplications = gigs.reduce((sum, g) => sum + g.applications.length, 0);
  const acceptedCount = gigs.reduce(
    (sum, g) => sum + g.applications.filter((a) => a.status === 'accepted').length,
    0,
  );

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
                Review applications and accept the students you want to work with.
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
                {/* Summary */}
                <div className="mb-5 flex flex-wrap gap-3">
                  <SummaryPill
                    icon={<Briefcase className="h-4 w-4" />}
                    label="Gigs posted"
                    value={gigs.length}
                    tone="slate"
                  />
                  <SummaryPill
                    icon={<FileText className="h-4 w-4" />}
                    label="Total applications"
                    value={totalApplications}
                    tone="sky"
                  />
                  <SummaryPill
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Accepted"
                    value={acceptedCount}
                    tone="emerald"
                  />
                </div>

                <div className="space-y-3">
                  {gigs.map((gig) => {
                    const expanded = expandedId === gig.id;
                    const pending = gig.applications.filter((a) => a.status === 'submitted').length;
                    const accepted = gig.applications.filter((a) => a.status === 'accepted').length;
                    return (
                      <div
                        key={gig.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300"
                      >
                        <button
                          onClick={() => setExpandedId(expanded ? null : gig.id)}
                          className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-[15px] font-bold text-slate-900">
                                {gig.title}
                              </h3>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                                  gig.status === 'open'
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : 'bg-slate-100 text-slate-500 ring-slate-200'
                                }`}
                              >
                                {gig.status === 'open' ? 'Open' : 'Closed'}
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
                                    busy={busyAppId === app.id}
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
    </div>
  );
}

function ApplicationRow({
  app,
  busy,
  onAccept,
  onDecline,
}: {
  app: ApplicationWithGig;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const meta = STATUS_META[app.status] ?? STATUS_META.submitted;
  const StatusIcon = meta.icon;
  const submittedDate = new Date(app.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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
