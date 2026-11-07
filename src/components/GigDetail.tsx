import { useEffect, useRef, useState } from 'react';
import {
  X,
  Clock,
  MapPin,
  FileText,
  BadgeDollarSign,
  TrendingUp,
  Send,
  Heart,
  Loader2,
  UploadCloud,
  CheckCircle2,
  Lock,
  FileCheck2,
  XCircle,
} from 'lucide-react';
import { supabase, type Gig, type Application } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import VerifiedBadge from '@/components/VerifiedBadge';

type GigDetailProps = {
  gig: Gig;
  onClose: () => void;
  onRequestAuth: () => void;
  onApplied: (gigId: string, application: Application) => void;
  existingApplication?: Application | null;
  hirerReleaseCount?: number;
};

const levelStyles: Record<string, string> = {
  Beginner: 'bg-sky-50 text-sky-700 ring-sky-200',
  Intermediate: 'bg-amber-50 text-amber-700 ring-amber-200',
  Expert: 'bg-rose-50 text-rose-700 ring-rose-200',
};

type ApplyStage = 'idle' | 'uploading' | 'submitted' | 'accepted' | 'declined';

export default function GigDetail({
  gig,
  onClose,
  onRequestAuth,
  onApplied,
  existingApplication,
  hirerReleaseCount,
}: GigDetailProps) {
  const { user } = useAuth();
  const initialStage: ApplyStage =
    existingApplication?.status === 'accepted'
      ? 'accepted'
      : existingApplication?.status === 'declined'
        ? 'declined'
        : existingApplication
          ? 'submitted'
          : 'idle';
  const [stage, setStage] = useState<ApplyStage>(initialStage);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleApplyClick = () => {
    if (!user) {
      onRequestAuth();
      return;
    }
    // Already authenticated — scroll to apply form
    document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setResumeFile(file);
    setError(null);
  };

  const submitApplication = async () => {
    if (!user) {
      onRequestAuth();
      return;
    }
    if (!resumeFile) {
      setError('Please upload your resume (PDF).');
      return;
    }
    if (resumeFile.type !== 'application/pdf') {
      setError('Resume must be a PDF file.');
      return;
    }

    setStage('uploading');
    setError(null);

    const ext = resumeFile.name.split('.').pop() || 'pdf';
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, resumeFile, { contentType: 'application/pdf' });

    if (uploadError) {
      setError(uploadError.message);
      setStage('idle');
      return;
    }

    const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);

    const { data: appData, error: insertError } = await supabase
      .from('applications')
      .insert({
        gig_id: gig.id,
        user_id: user.id,
        resume_url: urlData.publicUrl,
        resume_name: resumeFile.name,
        cover_note: coverNote.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setStage('idle');
      return;
    }

    setStage('submitted');
    onApplied(gig.id, appData as Application);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-start justify-center p-0 sm:p-4 sm:py-8">
        <div className="relative w-full max-w-3xl animate-[slideUp_0.25s_ease-out] rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          {/* Sticky header bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-7">
            <div className="flex flex-wrap gap-1.5">
              {gig.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 py-6 sm:px-7">
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  levelStyles[gig.experience_level] ?? levelStyles.Intermediate
                }`}
              >
                {gig.experience_level}
              </span>
              {gig.status === 'open' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Open
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[26px]">
              {gig.title}
            </h1>

            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{gig.description}</p>

            {/* Key facts grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FactCard
                icon={<BadgeDollarSign className="h-5 w-5" />}
                label="Budget"
                value={gig.payment_display}
                accent
              />
              <FactCard icon={<Clock className="h-5 w-5" />} label="Duration" value={gig.duration} />
              <FactCard icon={<MapPin className="h-5 w-5" />} label="Location" value={gig.location} />
              <FactCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Level"
                value={gig.experience_level}
              />
            </div>

            {/* Description */}
            <section className="mt-7">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                Gig details
              </h2>
              <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700">
                {gig.details}
              </p>
            </section>

            {/* Activity */}
            <section className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>
                <span className="font-bold text-slate-800">{gig.proposals_count}</span>
                {' '}student{gig.proposals_count === 1 ? '' : 's'} have applied so far
              </span>
            </section>

            {/* Poster */}
            <section className="mt-6 rounded-xl border border-slate-200 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                Posted by
              </h2>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${gig.posted_by_color}`}
                >
                  {gig.posted_by_initial}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-slate-900">{gig.posted_by_name}</p>
                    {hirerReleaseCount !== undefined && hirerReleaseCount > 0 && (
                      <VerifiedBadge kind="hirer" count={hirerReleaseCount} size="md" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">IIT Madras student</p>
                </div>
              </div>
            </section>

            {/* Apply section */}
            {stage === 'accepted' ? (
              <section
                id="apply-section"
                className="mt-6 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center shadow-sm shadow-emerald-100"
              >
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h3 className="mt-3 text-lg font-extrabold text-emerald-800">
                  You've been accepted!
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  {gig.posted_by_name} accepted your application for this gig. Reach out to them to
                  get started.
                </p>
              </section>
            ) : stage === 'declined' ? (
              <section
                id="apply-section"
                className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center"
              >
                <XCircle className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-lg font-extrabold text-slate-700">
                  Application declined
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {gig.posted_by_name} chose another student for this gig. Keep browsing — there
                  are plenty more gigs on CampusConnect.
                </p>
              </section>
            ) : stage === 'submitted' ? (
              <section
                id="apply-section"
                className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"
              >
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h3 className="mt-3 text-lg font-extrabold text-emerald-800">
                  Application submitted!
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Your resume has been sent to {gig.posted_by_name}. This gig is now pinned to the
                  top of your list so you can track it. You'll see an "Accepted" badge here the
                  moment the poster picks you.
                </p>
              </section>
            ) : (
              <section id="apply-section" className="mt-7 rounded-xl border border-slate-200 p-5">
                <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Apply to this gig
                </h2>

                {!user ? (
                  <div className="mt-3 flex flex-col items-center rounded-lg bg-slate-50 px-4 py-6 text-center">
                    <Lock className="h-8 w-8 text-slate-400" />
                    <p className="mt-2 font-semibold text-slate-700">
                      Sign in with your IITM student email to apply
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      We verify every student before they can send proposals.
                    </p>
                    <button
                      onClick={onRequestAuth}
                      className="mt-4 flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <GraduationCapIcon />
                      Sign in to apply
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-4">
                    {/* Resume upload */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-left transition ${
                          resumeFile
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`}
                      >
                        {resumeFile ? (
                          <>
                            <FileCheck2 className="h-7 w-7 shrink-0 text-emerald-600" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-emerald-800">
                                {resumeFile.name}
                              </p>
                              <p className="text-xs text-emerald-600">
                                {(resumeFile.size / 1024).toFixed(0)} KB · Click to replace
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-7 w-7 shrink-0 text-slate-400" />
                            <div>
                              <p className="text-sm font-bold text-slate-700">
                                Upload your resume (PDF)
                              </p>
                              <p className="text-xs text-slate-500">
                                Click to choose a file from your device
                              </p>
                            </div>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Cover note */}
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-slate-700">
                        Cover note <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        placeholder="Quickly tell the poster why you're a great fit…"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {error && (
                      <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200">
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 flex items-center gap-3 rounded-b-2xl border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-7">
            <button
              onClick={() => setSaved((s) => !s)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                saved
                  ? 'border-rose-300 bg-rose-50 text-rose-500'
                  : 'border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500'
              }`}
              aria-label="Save gig"
            >
              <Heart className={`h-[18px] w-[18px] ${saved ? 'fill-current' : ''}`} />
            </button>
            {stage === 'submitted' || stage === 'accepted' || stage === 'declined' ? (
              <button
                onClick={onClose}
                className={`ml-auto flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-sm transition ${
                  stage === 'accepted'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {stage === 'accepted' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Done
              </button>
            ) : !user ? (
              <button
                onClick={onRequestAuth}
                className="ml-auto flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                <Lock className="h-4 w-4" />
                Sign in to apply
              </button>
            ) : (
              <button
                onClick={submitApplication}
                disabled={stage === 'uploading'}
                className="ml-auto flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
              >
                {stage === 'uploading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GraduationCapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.42 10.922a1 1 0 0 0 0-1.844L12.293 5.256a1 1 0 0 0-.586 0L2.58 9.078a1 1 0 0 0 0 1.844L11.707 14.744a1 1 0 0 0 .586 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

function FactCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
          accent ? 'text-emerald-600' : 'text-slate-400'
        }`}
      >
        {icon}
        {label}
      </div>
      <p
        className={`text-sm font-bold leading-tight ${
          accent ? 'text-emerald-700' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
