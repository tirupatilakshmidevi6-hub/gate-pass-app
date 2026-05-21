'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, UserPlus, Upload, List,
  Building2, BarChart2, Settings, LogOut, Shield,
} from 'lucide-react';

const ADMIN_NAV = [
  { label: 'Dashboard',   href: '/',            icon: LayoutDashboard },
  { label: 'New Entry',   href: '/new-entry',   icon: UserPlus },
  { label: 'Bulk Upload', href: '/bulk-upload',  icon: Upload },
  { label: 'Entry List',  href: '/entry-list',  icon: List },
  { label: 'Reports',     href: '/reports',     icon: BarChart2 },
  { label: 'Settings',    href: '/settings',    icon: Settings },
];

const FACILITIES_NAV = [
  { label: 'Dashboard',  href: '/',           icon: LayoutDashboard },
  { label: 'Approvals',  href: '/approvals',  icon: Building2 },
  { label: 'Entry List', href: '/entry-list', icon: List },
  { label: 'Reports',    href: '/reports',    icon: BarChart2 },
];

export default function Sidebar({
  role, pendingCount, userName,
}: {
  role: 'admin' | 'facilities';
  pendingCount?: number;
  userName?: string;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const navItems = role === 'facilities' ? FACILITIES_NAV : ADMIN_NAV;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 fixed top-0 left-0 h-screen bg-gray-900 text-white flex flex-col z-30 overflow-y-auto">

      {/* ── Logo ── */}
      <div className="px-5 py-4 border-b border-gray-700">
        <Link href="/" className="inline-block mb-1">
          <div className="bg-white rounded-lg px-3 py-2 hover:opacity-90 transition-opacity">
            <img
              src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
              alt="NxtWave"
              className="h-7 w-auto object-contain"
            />
          </div>
        </Link>
        <div className="text-xs text-gray-400 leading-tight">Gate Pass System</div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {label === 'Approvals' && pendingCount && pendingCount > 0 ? (
                <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* ── Promotional banner ── */}
      <div className="px-3 pb-3">
        <div className="relative bg-gradient-to-b from-blue-700 to-blue-900 rounded-2xl p-4 text-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-500/20 rounded-full" />

          {/* Shield illustration */}
          <div className="relative flex justify-center mb-3">
            <div className="w-16 h-16 bg-blue-600/50 rounded-full flex items-center justify-center border-2 border-blue-400/30">
              <Shield size={30} className="text-blue-200" />
            </div>
          </div>

          <p className="relative text-white text-xs font-semibold leading-snug mb-3">
            Secure Every Entry,{' '}
            <span className="text-blue-200">Simplify Your Management</span>
          </p>

          {/* Carousel dots */}
          <div className="flex justify-center gap-1.5">
            <div className="w-4 h-1.5 bg-white rounded-full" />
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Logout ── */}
      <div className="border-t border-gray-700 px-5 py-4">
        {userName && (
          <p className="text-xs text-gray-400 mb-3 truncate">{userName}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
