'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Moon, Sun, ChevronDown, Menu, X, CheckCheck } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  '/users':       'Manage Users',
  '/activity':    'Activity Log',
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

type AppNotification = {
  id: string; title: string; message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean; related_entry_id: string | null; created_at: string;
};

const NOTIF_COLORS: Record<string, string> = {
  info:    'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
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
  userName: string;
  role: string;
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
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await fetch('/api/notifications').then((r) => r.ok ? r.json() : []);
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDrop(false);
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
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleNotificationClick(notif: AppNotification) {
    if (!notif.is_read) {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: notif.id }) });
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    setShowNotifDrop(false);
    if (notif.related_entry_id) router.push(`/entry-list?open=${notif.related_entry_id}`);
  }

  return (
    <header className="bg-white border-b border-gray-200 pl-14 md:pl-6 pr-4 md:pr-6 h-16 flex items-center gap-4 sticky top-0 z-20">
      {/* Page title */}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900 leading-tight">{pageTitle}</h1>
        <div className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
          <span>Home</span><span className="text-gray-300">›</span><span>{pageTitle}</span>
        </div>
      </div>

      {/* Search — hidden on mobile, icon only */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-72 xl:w-96 hidden sm:block" ref={searchRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setShowSearch(true); }}
            onFocus={handleFocus} placeholder="Search entries by name, phone, email…"
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
          {query && <button onClick={() => { setQuery(''); setShowSearch(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
          {showSearch && query.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
              {fetching && <div className="px-4 py-3 text-sm text-gray-400 text-center">Searching…</div>}
              {!fetching && results.length === 0 && <div className="px-4 py-3 text-sm text-gray-400 text-center">No matching entries found</div>}
              {!fetching && results.map((e) => {
                const rs = getRoleStyle(e.role ?? '');
                return (
                  <button key={e.id} onClick={() => handleSelect(e)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">{e.name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{e.name}</div>
                      <div className="text-xs text-gray-500">{e.reporting_date} · {e.building_name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {e.role && <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }} className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{e.role}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile search icon (sm and below) */}
      <button
        className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors ml-auto"
        onClick={() => { setShowSearch(true); setQuery(''); }}
        aria-label="Search"
      >
        <Search size={20} />
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1 flex-shrink-0 sm:ml-0">

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifDrop((v) => !v)}
            className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDrop && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                  {unreadCount > 0 && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{unreadCount} new</span>}
                </div>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <CheckCheck size={13} />Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</div>
                ) : notifications.map((n) => (
                  <button key={n.id} onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${NOTIF_COLORS[n.type] ?? 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold leading-tight ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                <button onClick={() => { setShowNotifDrop(false); router.push('/activity'); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  See All Activity →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
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
            <div className="text-xs text-gray-500 leading-tight capitalize">
              {role === 'ta' ? 'TA / HR Team' : role === 'facilities' ? 'Facilities Team' : role}
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
