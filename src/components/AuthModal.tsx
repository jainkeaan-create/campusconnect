import { useEffect, useState } from 'react';
import { X, Mail, Lock, User as UserIcon, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { IITM_EMAIL_DOMAINS } from '@/lib/supabase';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onAuthed?: () => void;
};

export default function AuthModal({ open, onClose, initialMode = 'signin', onAuthed }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password, fullName);
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      onAuthed?.();
      onClose();
    } else {
      const { error: err } = await signIn(email, password);
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      onAuthed?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-[slideUp_0.25s_ease-out] rounded-2xl bg-white p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            {mode === 'signup' ? 'Verify you are an IITM student' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'signup'
              ? 'Sign up with your IIT Madras student email to apply and post gigs.'
              : 'Sign in with your CampusConnect student account.'}
          </p>
        </div>

        {mode === 'signup' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Accepted domains: {IITM_EMAIL_DOMAINS.join(', ')}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <Field
              icon={<UserIcon className="h-[18px] w-[18px]" />}
              input={
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              }
            />
          )}
          <Field
            icon={<Mail className="h-[18px] w-[18px]" />}
            input={
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@smail.iitm.ac.in"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            }
          />
          <Field
            icon={<Lock className="h-[18px] w-[18px]" />}
            input={
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            }
          />

          {error && (
            <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'signup' ? (
              'Create student account'
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === 'signup' ? 'Already have an account?' : "Don't have one yet?"}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError(null);
            }}
            className="font-bold text-emerald-600 hover:text-emerald-700"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, input }: { icon: React.ReactNode; input: React.ReactNode }) {
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
      <span className="text-slate-400">{icon}</span>
      {input}
    </div>
  );
}
