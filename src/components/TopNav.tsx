'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Moon, Sun, ChevronDown, Menu, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { getRoleStyle } from '@/lib/constants';

const PAGE_TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/new-entry':   'New Entry',
  '/bulk-upload': 'Bulk Upload',
  '/entry-list':  'Entry List',
  '/reports':     'Reports',
  '/settings':    'Settings',
  '/approvals':   'Approvals',
};

const STATUS_COLORS: Record<string, string> = {
  'Pending Form':     'bg-gray-100 text-gray-600',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Approved':         'bg-green-100 text-green-700',
  'Rejected':         'bg-red-100 text-red-700',
};

type SearchEntry = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  employee_id: string | null; role: string | null; purpose: string;
  reporting_date: string; building_name: string; poc_name: string; status: string;
};

export default function TopNav({
  userName, role, pendingCount,
}: {
  userName: string;
  role: 'admin' | 'facilities';
  pendingCount: number;
}) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { dark, toggle } = useTheme();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';

  const [query,      setQuery]      = useState('');
  const [allEntries, setAllEntries] = useState<SearchEntry[]>([]);
  const [showDrop,   setShowDrop]   = useState(false);
  const [fetching,   setFetching]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleFocus() {
    setShowDrop(true);
    if (allEntries.length === 0) {
      setFetching(true);
      try {
        const data = await fetch('/api/entries').then((r) => r.json());
        setAllEntries(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
      finally { setFetching(false); }
    }
  }

  const q = query.trim().toLowerCase();
  const results: SearchEntry[] = q.length === 0 ? [] : allEntries.filter((e) =>
    [e.name, e.email, e.employee_id, e.mobile_number, e.building_name, e.poc_name, e.purpose, e.role, e.status]
      .some((v) => v?.toLowerCase().includes(q))
  ).slice(0, 8);

  function handleSelect(entry: SearchEntry) {
    setShowDrop(false);
    setQuery('');
    router.push(`/entry-list?open=${entry.id}`);
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center gap-4 sticky top-0 z-20">
      {/* Hamburger */}
      <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg flex-shrink-0">
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900 leading-tight">{pageTitle}</h1>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span>Home</span><span className="text-gray-300">›</span><span>{pageTitle}</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-72 xl:w-96" ref={dropRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
            onFocus={handleFocus}
            placeholder="Search entries by name, phone, email…"
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          {query && (
            <button onClick={() => { setQuery(''); setShowDrop(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}

          {/* Results dropdown */}
          {showDrop && query.trim().length > 0 && (
            <div className="search-dropdown absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
              {fetching && (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Searching…</div>
              )}
              {!fetching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">No matching entries found</div>
              )}
              {!fetching && results.map((e) => {
                const rs = getRoleStyle(e.role ?? '');
                return (
                  <button key={e.id} onClick={() => handleSelect(e)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{e.name}</div>
                      <div className="text-xs text-gray-500">{e.reporting_date} · {e.building_name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {e.role && (
                        <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                          className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{e.role}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Bell */}
        <button className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <Bell size={18} />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        {/* Theme toggle — works! */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* Profile */}
        <button className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-gray-50 rounded-xl transition-colors">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold text-gray-900 leading-tight">{userName}</div>
            <div className="text-xs text-gray-500 leading-tight">
              {role === 'admin' ? 'Super Admin' : 'Facilities Team'}
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
