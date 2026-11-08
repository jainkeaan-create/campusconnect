import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck, CircleCheck as CheckCircle2, X, Loader as Loader2, Smartphone, CreditCard, Landmark, Wallet, Banknote } from 'lucide-react';
import { supabase, colorForName, initialForName, formatPayment, type Gig } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type PendingGig = {
  title: string;
  description: string;
  details: string;
  payment: number;
  paymentType: 'fixed' | 'hourly';
  tags: string[];
  experienceLevel: string;
  duration: string;
  location: string;
  deadline: string | null;
};

type PaymentStepProps = {
  gig: PendingGig;
  onBack: () => void;
  onClose: () => void;
  onPosted: (gig: Gig) => void;
};

type Stage = 'method' | 'processing' | 'success' | 'error';

type MethodId = 'upi' | 'card' | 'netbanking' | 'wallet';

const METHODS: { id: MethodId; label: string; icon: typeof Smartphone; sublabel: string }[] = [
  { id: 'upi', label: 'UPI', icon: Smartphone, sublabel: 'Google Pay, PhonePe, Paytm, BHIM' },
  { id: 'card', label: 'Debit / Credit Card', icon: CreditCard, sublabel: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net Banking', icon: Landmark, sublabel: 'All major banks' },
  { id: 'wallet', label: 'Mobile Wallets', icon: Wallet, sublabel: 'Paytm, Mobikwik, Amazon Pay' },
];

const PROVIDER_BADGES: Record<MethodId, string[]> = {
  upi: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'],
  card: ['Visa', 'Mastercard', 'RuPay'],
  netbanking: ['HDFC', 'SBI', 'ICICI', 'Axis'],
  wallet: ['Paytm', 'Mobikwik', 'Amazon Pay'],
};

function generateTransactionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'DEMO-';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default function PaymentStep({ gig, onBack, onClose, onPosted }: PaymentStepProps) {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<MethodId>('upi');
  const [stage, setStage] = useState<Stage>('method');
  const [txnId, setTxnId] = useState('');
  const [postError, setPostError] = useState<string | null>(null);
  const [savedGig, setSavedGig] = useState<Gig | null>(null);
  const submittingRef = useRef(false);

  const fullName = (user?.user_metadata?.full_name as string) || 'Student';
  const platformFee = useMemo(() => {
    // Demo platform fee: flat ₹49 for gigs under ₹2,000, else ₹99
    return gig.payment < 2000 ? 49 : 99;
  }, [gig.payment]);
  const total = gig.payment + platformFee;

  // Drive the simulated payment + real DB insert as one atomic flow.
  // Runs once when stage becomes 'processing'.
  useEffect(() => {
    if (stage !== 'processing') return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      runPostGig();
    }, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handlePayNow = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPostError(null);
    setStage('processing');
  };

  const runPostGig = async () => {
    if (!user) {
      submittingRef.current = false;
      setPostError('Your session has ended. Please sign in again and retry.');
      setStage('error');
      return;
    }

    const newGig = {
      title: gig.title,
      description: gig.description,
      details: gig.details,
      payment: gig.payment,
      payment_type: gig.paymentType,
      payment_display: formatPayment(gig.payment, gig.paymentType),
      tags: gig.tags,
      posted_by_name: fullName,
      posted_by_initial: initialForName(fullName),
      posted_by_color: colorForName(fullName),
      experience_level: gig.experienceLevel,
      duration: gig.duration,
      location: gig.location,
      proposals_count: 0,
      status: 'open',
      deadline: gig.deadline,
      user_id: user.id,
    };

    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert(newGig)
      .select()
      .single();

    if (insertError || !data) {
      submittingRef.current = false;
      setPostError(insertError?.message ?? 'Failed to post your gig. Please try again.');
      setStage('error');
      return;
    }

    setSavedGig(data as Gig);
    setTxnId(generateTransactionId());
    setStage('success');
  };

  // After success, let the user see the confirmation, then hand the saved
  // gig up AND close everything (payment step + post-gig modal) together.
  useEffect(() => {
    if (stage !== 'success' || !savedGig) return;
    const t = setTimeout(() => {
      onPosted(savedGig);
      onClose();
    }, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, savedGig]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={stage === 'processing' ? undefined : onClose} />
      <div className="flex min-h-full items-start justify-center p-0 sm:p-4 sm:py-8">
        <div className="relative w-full max-w-lg animate-[slideUp_0.25s_ease-out] rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-7">
            <div className="flex items-center gap-2">
              {stage === 'method' && (
                <button
                  onClick={onBack}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                  {stage === 'success' ? 'Payment successful' : stage === 'error' ? 'Payment issue' : 'Checkout'}
                </h2>
                <p className="text-xs text-slate-500">
                  {stage === 'processing'
                    ? 'Securing your demo payment…'
                    : stage === 'success'
                      ? 'Your gig is now live'
                      : stage === 'error'
                        ? 'Something went wrong'
                        : 'Demo platform fee for posting a gig'}
                </p>
              </div>
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

          <div className="px-5 py-6 sm:px-7">
            {/* Demo banner — persistent */}
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-800">DEMO PAYMENT</p>
                <p className="text-xs text-amber-700">
                  No actual money will be deducted. This is a prototype checkout flow.
                </p>
              </div>
            </div>

            {stage === 'method' && (
              <MethodStage
                gig={gig}
                platformFee={platformFee}
                total={total}
                selectedMethod={selectedMethod}
                onSelect={setSelectedMethod}
                onPayNow={handlePayNow}
              />
            )}

            {stage === 'processing' && <ProcessingStage methodName={METHODS.find((m) => m.id === selectedMethod)?.label ?? 'payment'} />}

            {stage === 'success' && savedGig && (
              <SuccessStage
                txnId={txnId}
                total={total}
                methodName={METHODS.find((m) => m.id === selectedMethod)?.label ?? 'Demo'}
                onDone={() => {
                  onPosted(savedGig);
                  onClose();
                }}
              />
            )}

            {stage === 'error' && (
              <ErrorStage
                message={postError ?? 'Something went wrong while posting your gig.'}
                onRetry={runPostGig}
                onBack={() => {
                  submittingRef.current = false;
                  setStage('method');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Method selection ---------- */

function MethodStage({
  gig,
  platformFee,
  total,
  selectedMethod,
  onSelect,
  onPayNow,
}: {
  gig: PendingGig;
  platformFee: number;
  total: number;
  selectedMethod: MethodId;
  onSelect: (m: MethodId) => void;
  onPayNow: () => void;
}) {
  return (
    <>
      {/* Order summary */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Gig summary</h3>
        <p className="text-sm font-bold text-slate-900">{gig.title}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {gig.tags.map((t) => (
            <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Gig budget</span>
            <span className="font-semibold text-slate-800">{formatPayment(gig.payment, gig.paymentType)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Platform fee (demo)</span>
            <span className="font-semibold text-slate-800">₹{platformFee}</span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-2.5">
            <span className="font-bold text-slate-900">Total payable</span>
            <span className="text-lg font-extrabold text-emerald-700">₹{new Intl.NumberFormat('en-IN').format(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Choose a payment method</h3>
      <div className="space-y-2.5">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const active = selectedMethod === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                active
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${active ? 'text-emerald-800' : 'text-slate-800'}`}>{m.label}</p>
                <p className="truncate text-xs text-slate-500">{m.sublabel}</p>
              </div>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                }`}
              >
                {active && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Provider badges for selected method */}
      <div className="mt-4 flex flex-wrap gap-2">
        {PROVIDER_BADGES[selectedMethod].map((p) => (
          <span key={p} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {p}
          </span>
        ))}
      </div>

      {/* Pay now */}
      <button
        onClick={onPayNow}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
      >
        <Lock className="h-4 w-4" />
        Pay ₹{new Intl.NumberFormat('en-IN').format(total)} Now
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Demo checkout · 256-bit simulated encryption
      </p>
    </>
  );
}

/* ---------- Processing ---------- */

function ProcessingStage({ methodName }: { methodName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        <Loader2 className="h-8 w-8 animate-pulse text-emerald-600" />
      </div>
      <h3 className="mt-6 text-lg font-extrabold text-slate-900">Processing your payment…</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">
        Please wait while we securely process your {methodName} payment. Do not close or refresh this
        window.
      </p>
      <div className="mt-5 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
        <Lock className="h-3.5 w-3.5" />
        Encrypting transaction details
      </div>
    </div>
  );
}

/* ---------- Success ---------- */

function SuccessStage({
  txnId,
  total,
  methodName,
  onDone,
}: {
  txnId: string;
  total: number;
  methodName: string;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-xl font-extrabold text-slate-900">Payment successful!</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        Your demo {methodName} payment of ₹{new Intl.NumberFormat('en-IN').format(total)} was
        processed. Your gig is now live on CampusConnect.
      </p>

      <div className="mt-5 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Transaction ID</span>
          <span className="font-bold text-slate-800">{txnId}</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">Status</span>
          <span className="font-bold text-emerald-600">Success</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">Amount</span>
          <span className="font-bold text-slate-800">₹{new Intl.NumberFormat('en-IN').format(total)}</span>
        </div>
      </div>

      <button
        onClick={onDone}
        className="mt-6 flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <CheckCircle2 className="h-4 w-4" />
        View my gig on the homepage
      </button>
    </div>
  );
}

/* ---------- Error ---------- */

function ErrorStage({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
        <X className="h-7 w-7 text-rose-600" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900">We couldn't post your gig</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{message}</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <button
          onClick={onRetry}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Loader2 className="hidden h-4 w-4" />
          Try posting again
        </button>
        <button
          onClick={onBack}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          Back to payment
        </button>
      </div>
    </div>
  );
}
