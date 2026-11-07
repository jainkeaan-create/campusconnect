import { ShieldCheck, Store } from 'lucide-react';

type BadgeKind = 'hirer' | 'seller';

type VerifiedBadgeProps = {
  kind: BadgeKind;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
};

const KIND_META: Record<BadgeKind, { label: string; icon: typeof ShieldCheck; classes: string }> = {
  hirer: {
    label: 'Verified Hirer',
    icon: ShieldCheck,
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  seller: {
    label: 'Verified Seller',
    icon: Store,
    classes: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
};

export default function VerifiedBadge({ kind, count, size = 'sm', className = '' }: VerifiedBadgeProps) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const sizeClasses =
    size === 'md'
      ? 'px-2.5 py-1 text-xs'
      : 'px-2 py-0.5 text-[11px]';
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold ring-1 ring-inset ${meta.classes} ${sizeClasses} ${className}`}
      title={
        count !== undefined
          ? `${meta.label} · ${count} paid ${kind === 'hirer' ? 'gig' : 'gig'}${count === 1 ? '' : 's'}`
          : meta.label
      }
    >
      <Icon className={iconSize} />
      {meta.label}
      {count !== undefined && count > 0 && (
        <span className="font-extrabold">· {count}</span>
      )}
    </span>
  );
}
