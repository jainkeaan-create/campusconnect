import { Clock, MapPin, FileText, ChevronRight, Pin, CheckCircle2 } from 'lucide-react';
import type { Gig } from '@/lib/supabase';

type GigCardProps = {
  gig: Gig;
  onClick: () => void;
  applied?: boolean;
  pinned?: boolean;
};

const levelStyles: Record<string, string> = {
  Beginner: 'bg-sky-50 text-sky-700 ring-sky-200',
  Intermediate: 'bg-amber-50 text-amber-700 ring-amber-200',
  Expert: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function GigCard({ gig, onClick, applied, pinned }: GigCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        pinned
          ? 'border-emerald-300 bg-emerald-50/40 shadow-md shadow-emerald-100/60 hover:border-emerald-400 hover:shadow-emerald-200/60'
          : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-emerald-100/50'
      }`}
    >
      {pinned && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
          <Pin className="h-3 w-3 fill-current" />
          Applied
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {gig.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            levelStyles[gig.experience_level] ?? levelStyles.Intermediate
          }`}
        >
          {gig.experience_level}
        </span>
      </div>

      <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-slate-900 transition group-hover:text-emerald-700">
        {gig.title}
      </h3>

      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{gig.description}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {gig.duration}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {gig.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          {gig.proposals_count} proposal{gig.proposals_count === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${gig.posted_by_color}`}
          >
            {gig.posted_by_initial}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-700">{gig.posted_by_name}</p>
            <p className="text-[11px] text-slate-400">Posted a gig</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-extrabold text-emerald-700">{gig.payment_display}</p>
          {applied ? (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Applied
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-400 transition group-hover:text-emerald-600">
              View details
              <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
