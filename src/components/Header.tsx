import { useState, useRef, useEffect } from 'react';
import { Search, GraduationCap, Plus, LogOut, User as UserIcon, ChevronDown, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type HeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onPostGig: () => void;
  onSignIn: () => void;
  onMyGigs: () => void;
};

export default function Header({ searchQuery, onSearchChange, onPostGig, onSignIn, onMyGigs }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fullName = (user?.user_metadata?.full_name as string) || 'Student';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-base font-bold tracking-tight text-slate-900">CampusConnect</span>
            <span className="text-[11px] font-medium text-slate-400">IIT Madras · Gigs</span>
          </div>
        </a>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search gigs by title, skill, or keyword…"
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Post a gig */}
        <button
          onClick={onPostGig}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 sm:flex"
        >
          <Plus className="h-4 w-4" />
          Post a gig
        </button>

        {/* Auth area */}
        {user ? (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-1 pr-2 transition hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {initial}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="truncate text-sm font-bold text-slate-900">{fullName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onPostGig();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4 text-slate-400" />
                  Post a gig
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onMyGigs();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  My posted gigs
                </button>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
