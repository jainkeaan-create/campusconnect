import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Gig = {
  id: string;
  title: string;
  description: string;
  details: string;
  payment: number;
  payment_type: 'fixed' | 'hourly';
  payment_display: string;
  tags: string[];
  posted_by_name: string;
  posted_by_initial: string;
  posted_by_color: string;
  experience_level: string;
  duration: string;
  location: string;
  proposals_count: number;
  status: string;
  payment_status: 'pending' | 'released';
  completed_at: string | null;
  deadline: string | null;
  user_id: string | null;
  created_at: string;
};

export type Application = {
  id: string;
  gig_id: string;
  user_id: string;
  resume_url: string;
  resume_name: string | null;
  cover_note: string | null;
  status: string;
  created_at: string;
};

export type EscrowRelease = {
  id: string;
  gig_id: string;
  hirer_id: string;
  seller_id: string;
  amount: number;
  txn_id: string;
  released_at: string;
};

export type BadgeCounts = {
  hirer: number;
  seller: number;
};

/** Accepted IIT Madras student email domains. */
export const IITM_EMAIL_DOMAINS = ['smail.iitm.ac.in', 'iitm.ac.in'];

export function isIitmEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return IITM_EMAIL_DOMAINS.some((d) => lower.endsWith('@' + d));
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-rose-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-fuchsia-500',
  'bg-sky-500',
  'bg-lime-600',
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initialForName(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function formatPayment(
  amount: number,
  type: 'fixed' | 'hourly',
): string {
  const formatted = new Intl.NumberFormat('en-IN').format(amount);
  if (type === 'hourly') return `₹${formatted}/hr`;
  return `₹${formatted} fixed price`;
}

export function generateDemoTxnId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'DEMO-ESCROW-';
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Fetch the verified-hirer and verified-seller released-payment counts
 * for a single user. Returns {0,0} if the user has no releases.
 */
export async function fetchBadgeCounts(userId: string): Promise<BadgeCounts> {
  const [hirerRes, sellerRes] = await Promise.all([
    supabase
      .from('hirer_release_counts')
      .select('released_count')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('seller_release_counts')
      .select('released_count')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  return {
    hirer: (hirerRes.data as { released_count?: number } | null)?.released_count ?? 0,
    seller: (sellerRes.data as { released_count?: number } | null)?.released_count ?? 0,
  };
}

/**
 * Fetch a map of user_id -> released hirer count for a set of users.
 * Useful for batch-loading badges to show on gig cards.
 */
export async function fetchHirerBadgeMap(
  userIds: string[],
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('hirer_release_counts')
    .select('user_id, released_count')
    .in('user_id', userIds);
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { user_id: string; released_count: number }[]) {
    map[row.user_id] = row.released_count;
  }
  return map;
}
