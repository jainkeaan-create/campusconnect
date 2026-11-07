import { useEffect, useState } from 'react';
import { X, Loader2, Plus, Tag } from 'lucide-react';
import { supabase, colorForName, initialForName, formatPayment, type Gig } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type PostGigModalProps = {
  open: boolean;
  onClose: () => void;
  onPosted: (gig: Gig) => void;
};

const TAG_OPTIONS = [
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
  'Research',
  'Python',
  'React',
  'Flutter',
];

const LEVELS = ['Beginner', 'Intermediate', 'Expert'];
const DURATIONS = ['Less than 1 week', '1 to 2 weeks', '2 to 3 weeks', '3 to 4 weeks', '1+ months'];
const LOCATIONS = ['Remote', 'On campus'];
const PAYMENT_TYPES: Array<'fixed' | 'hourly'> = ['fixed', 'hourly'];

export default function PostGigModal({ open, onClose, onPosted }: PostGigModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [payment, setPayment] = useState('');
  const [paymentType, setPaymentType] = useState<'fixed' | 'hourly'>('fixed');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const fullName = (user?.user_metadata?.full_name as string) || 'Student';

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !selectedTags.includes(t)) {
      setSelectedTags((prev) => [...prev, t]);
    }
    setCustomTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in to post a gig.');
      return;
    }
    if (selectedTags.length === 0) {
      setError('Please pick at least one tag.');
      return;
    }
    const amount = parseFloat(payment);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    setBusy(true);
    const newGig = {
      title: title.trim(),
      description: description.trim(),
      details: details.trim() || description.trim(),
      payment: amount,
      payment_type: paymentType,
      payment_display: formatPayment(amount, paymentType),
      tags: selectedTags,
      posted_by_name: fullName,
      posted_by_initial: initialForName(fullName),
      posted_by_color: colorForName(fullName),
      experience_level: experienceLevel,
      duration,
      location,
      proposals_count: 0,
      status: 'open',
      user_id: user.id,
    };

    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert(newGig)
      .select()
      .single();

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onPosted(data as Gig);
    onClose();
    // reset
    setTitle('');
    setDescription('');
    setDetails('');
    setPayment('');
    setSelectedTags([]);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center p-0 sm:p-4 sm:py-8">
        <div className="relative w-full max-w-2xl animate-[slideUp_0.25s_ease-out] rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-7">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Post a gig</h2>
              <p className="text-xs text-slate-500">Reach IIT Madras students who can get it done.</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-7">
            <FormRow label="Gig title">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build a Python script to scrape mess menus"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </FormRow>

            <FormRow label="Short description" hint="Shown on the gig card">
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One-line summary of what you need"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </FormRow>

            <FormRow label="Full details" hint="Shown when a student opens the gig">
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe scope, deliverables, requirements, and any bonus expectations"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </FormRow>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Payment (₹)">
                <div className="flex gap-2">
                  <input
                    required
                    type="number"
                    min="1"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    placeholder="2000"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as 'fixed' | 'hourly')}
                    className="h-11 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === 'fixed' ? 'fixed' : 'hourly'}
                      </option>
                    ))}
                  </select>
                </div>
              </FormRow>

              <FormRow label="Experience level">
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="Duration">
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="Location">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </FormRow>
            </div>

            <FormRow label="Tags" hint="Pick what fits — students filter by these">
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder="Add a custom tag"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {selectedTags.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {selectedTags.join(', ')}
                </p>
              )}
            </FormRow>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200">
                {error}
              </p>
            )}

            <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:-mx-7 sm:px-7">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Post gig
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal text-slate-400">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
