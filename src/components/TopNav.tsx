'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Moon, Sun, X, CheckCheck } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { getRoleStyle } from '@/lib/constants';

const PAGE_TITLES: Record<string, string> = {
  '/':                  'Dashboard',
  '/create-gate-pass':  'Create Gate Pass',
  '/new-entry':         'New Entry',
  '/bulk-upload':       'Bulk Upload',
  '/entry-list':        'Gate Pass History',
  '/reports':           'Reports',
  '/settings':          'Settings',
  '/approvals':         'Approvals',
  '/users':             'Manage Users',
  '/activity':          'Activity Log',
};

type SearchEntry = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  employee_id: string | null; role: string | null; purpose: string;
  reporting_date: string; building_name: string; poc_name: string; status: string;
};

type AppNotification = {
  id: string; title: string; message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean; related_entry_id: string | null; created_at: string;
};

const NOTIF_DOT: Record<string, string> = {
  info:    'bg-blue-400',
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  error:   'bg-red-400',
};

const STATUS_PILL: Record<string, string> = {
  'Pending Form':     'bg-gray-100 text-gray-600',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Approved':         'bg-green-100 text-green-700',
  'Rejected':         'bg-red-100 text-red-700',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TopNav({
  userName, role, pendingCount,
}: {
  userName:     string;
  role:         string;
  pendingCount: number;
}) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { dark, toggle } = useTheme();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';

  // Search
  const [query,      setQuery]      = useState('');
  const [allEntries, setAllEntries] = useState<SearchEntry[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [fetching,   setFetching]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notifications
  const [notifications,  setNotifications]  = useState<AppNotification[]>([]);
  const [showNotifDrop,  setShowNotifDrop]  = useState(false);
  const notifRef  = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await fetch('/api/notifications').then((r) => r.ok ? r.json() : []);
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => { void fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))  setShowNotifDrop(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleFocus() {
    setShowSearch(true);
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
    setShowSearch(false); setQuery('');
    router.push(`/entry-list?open=${entry.id}`);
  }

  async function handleMarkAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleNotificationClick(notif: AppNotification) {
    if (!notif.is_read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      });
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    setShowNotifDrop(false);
    if (notif.related_entry_id) router.push(`/entry-list?open=${notif.related_entry_id}`);
  }

  const roleLabel = role === 'ta' ? 'TA / HR Team' : role === 'facilities' ? 'Facilities Team' : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <header
      className="bg-white pl-14 md:pl-4 pr-4 md:pr-5 h-14 flex items-center gap-3 sticky top-0 z-20 flex-shrink-0"
      style={{ borderBottom: '1px solid #F0F3FA' }}
    >
      {/* Page title */}
      <div className="min-w-0 flex-shrink-0 hidden sm:block">
        <h1 className="text-[15px] font-bold text-gray-900 leading-tight">{pageTitle}</h1>
      </div>

      <div className="hidden sm:block w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

      {/* Search */}
      <div className="flex-1 flex justify-start sm:justify-center">
        <div className="relative w-full max-w-xs sm:max-w-sm xl:max-w-md" ref={searchRef}>
          <div className="topnav-search relative flex items-center rounded-xl overflow-hidden">
            <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSearch(true); }}
              onFocus={handleFocus}
              placeholder="Search visitors, passes…"
              className="w-full pl-8 pr-7 py-2 text-sm bg-transparent border-0 focus:outline-none text-gray-700 placeholder-gray-400"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setShowSearch(false); }}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {showSearch && query.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-scale-in">
              {fetching && (
                <div className="px-4 py-4 text-sm text-gray-400 text-center">Searching…</div>
              )}
              {!fetching && results.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">No entries match &ldquo;{query}&rdquo;</p>
                </div>
              )}
              {!fetching && results.map((e) => {
                const rs = getRoleStyle(e.role ?? '');
                return (
                  <button
                    key={e.id}
                    onClick={() => handleSelect(e)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.reporting_date} · {e.building_name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {e.role && (
                        <span
                          style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                        >
                          {e.role}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_PILL[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
      <div className="flex items-center gap-0.5 flex-shrink-0">

        {/* Mobile search icon */}
        <button
          className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          onClick={() => { setShowSearch(true); setQuery(''); }}
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDrop((v) => !v)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDrop && (
            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${NOTIF_DOT[n.type] ?? 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold leading-snug ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2.5 text-center" style={{ borderTop: '1px solid #F3F4F6' }}>
                <button
                  onClick={() => { setShowNotifDrop(false); router.push('/activity'); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  See all activity →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

        {/* Profile */}
        <div className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-default">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#146EF5,#2563EB)' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-[13px] font-semibold text-gray-900 leading-tight">{userName}</div>
            <div className="text-[10px] text-gray-400 leading-tight">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
