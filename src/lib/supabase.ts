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
