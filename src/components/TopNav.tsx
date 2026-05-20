'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Moon, ChevronDown, Menu } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/new-entry':   'New Entry',
  '/bulk-upload': 'Bulk Upload',
  '/entry-list':  'Entry List',
  '/reports':     'Reports',
  '/settings':    'Settings',
  '/approvals':   'Approvals',
};

export default function TopNav({
  userName,
  role,
  pendingCount,
}: {
  userName: string;
  role: 'admin' | 'facilities';
  pendingCount: number;
}) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center gap-4 sticky top-0 z-20">
      {/* Hamburger */}
      <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg flex-shrink-0">
        <Menu size={20} />
      </button>

      {/* Page title + breadcrumb */}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900 leading-tight">{pageTitle}</h1>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span>Home</span>
          <span className="text-gray-300">›</span>
          <span>{pageTitle}</span>
        </div>
      </div>

      {/* Search — centred */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-72 xl:w-96">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-9 pr-14 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-md font-mono">
            ⌘K
          </span>
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

        {/* Dark mode toggle */}
        <button className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <Moon size={18} />
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
