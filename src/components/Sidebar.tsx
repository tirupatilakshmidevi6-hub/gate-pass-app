'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, UserPlus, Upload, List,
  Building2, BarChart2, Settings, LogOut, Shield, Users, Activity, Menu, X,
} from 'lucide-react';

type Role = string;

const ADMIN_NAV = [
  { label: 'Dashboard',    href: '/',           icon: LayoutDashboard },
  { label: 'New Entry',    href: '/new-entry',  icon: UserPlus },
  { label: 'Bulk Upload',  href: '/bulk-upload', icon: Upload },
  { label: 'Entry List',   href: '/entry-list', icon: List },
  { label: 'Reports',      href: '/reports',    icon: BarChart2 },
  { label: 'Activity Log', href: '/activity',   icon: Activity },
  { label: 'Users',        href: '/users',      icon: Users },
  { label: 'Settings',     href: '/settings',   icon: Settings },
];

const TA_NAV = [
  { label: 'Dashboard',    href: '/',           icon: LayoutDashboard },
  { label: 'New Entry',    href: '/new-entry',  icon: UserPlus },
  { label: 'Bulk Upload',  href: '/bulk-upload', icon: Upload },
  { label: 'Entry List',   href: '/entry-list', icon: List },
  { label: 'Reports',      href: '/reports',    icon: BarChart2 },
  { label: 'Activity Log', href: '/activity',   icon: Activity },
];

const FACILITIES_NAV = [
  { label: 'Dashboard',  href: '/',           icon: LayoutDashboard },
  { label: 'Approvals',  href: '/approvals',  icon: Building2 },
  { label: 'Entry List', href: '/entry-list', icon: List },
  { label: 'Reports',    href: '/reports',    icon: BarChart2 },
];

// Bottom nav items shown on mobile
const BOTTOM_NAV_ADMIN = [
  { label: 'Dashboard', href: '/',           icon: LayoutDashboard },
  { label: 'New Entry', href: '/new-entry',  icon: UserPlus },
  { label: 'Approvals', href: '/approvals',  icon: Building2 },
  { label: 'List',      href: '/entry-list', icon: List },
];

const BOTTOM_NAV_TA = [
  { label: 'Dashboard', href: '/',           icon: LayoutDashboard },
  { label: 'New Entry', href: '/new-entry',  icon: UserPlus },
  { label: 'List',      href: '/entry-list', icon: List },
  { label: 'Reports',   href: '/reports',    icon: BarChart2 },
];

const BOTTOM_NAV_FACILITIES = [
  { label: 'Dashboard', href: '/',           icon: LayoutDashboard },
  { label: 'Approvals', href: '/approvals',  icon: Building2 },
  { label: 'List',      href: '/entry-list', icon: List },
  { label: 'Reports',   href: '/reports',    icon: BarChart2 },
];

function navFor(role: Role) {
  if (role === 'admin')      return ADMIN_NAV;
  if (role === 'ta')         return TA_NAV;
  if (role === 'facilities') return FACILITIES_NAV;
  return [];
}

function bottomNavFor(role: Role) {
  if (role === 'admin')      return BOTTOM_NAV_ADMIN;
  if (role === 'ta')         return BOTTOM_NAV_TA;
  if (role === 'facilities') return BOTTOM_NAV_FACILITIES;
  return [];
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:      { label: 'Admin',          cls: 'bg-purple-900 text-purple-300' },
  ta:         { label: 'TA / HR Team',   cls: 'bg-blue-900   text-blue-300'   },
  facilities: { label: 'Facilities Team', cls: 'bg-teal-900  text-teal-300'   },
  staff:      { label: 'Staff',          cls: 'bg-green-900  text-green-300'  },
  intern:     { label: 'Intern',         cls: 'bg-amber-900  text-amber-300'  },
  other:      { label: 'Other',          cls: 'bg-gray-700   text-gray-300'   },
};

export default function Sidebar({
  role, pendingCount, pendingUsersCount, userName,
}: {
  role: Role;
  pendingCount?: number;
  pendingUsersCount?: number;
  userName?: string;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const navItems = navFor(role);
  const bottomItems = bottomNavFor(role);
  const badge    = ROLE_BADGE[role] ?? { label: role, cls: 'bg-gray-700 text-gray-300' };
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const SidebarContent = () => (
    <aside className="w-56 h-full bg-gray-900 text-white flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-700">
        <Link href="/" className="inline-block mb-1" onClick={() => setMobileOpen(false)}>
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

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}>
              <Icon size={16} />
              <span>{label}</span>
              {label === 'Approvals' && pendingCount && pendingCount > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">{pendingCount}</span>
              )}
              {label === 'Users' && pendingUsersCount && pendingUsersCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">{pendingUsersCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Promo banner */}
      <div className="px-3 pb-3">
        <div className="relative bg-gradient-to-b from-blue-700 to-blue-900 rounded-2xl p-4 text-center overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-500/20 rounded-full" />
          <div className="relative flex justify-center mb-3">
            <div className="w-16 h-16 bg-blue-600/50 rounded-full flex items-center justify-center border-2 border-blue-400/30">
              <Shield size={30} className="text-blue-200" />
            </div>
          </div>
          <p className="relative text-white text-xs font-semibold leading-snug mb-3">
            Secure Every Entry,{' '}
            <span className="text-blue-200">Simplify Your Management</span>
          </p>
        </div>
      </div>

      {/* User + Logout */}
      <div className="border-t border-gray-700 px-5 py-4 space-y-2">
        {userName && (
          <div>
            <p className="text-xs text-white font-medium truncate">{userName}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full mt-1">
          <LogOut size={15} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <div className="hidden md:flex w-56 fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </div>

      {/* ── Mobile: hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-gray-900 rounded-lg text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* ── Mobile: backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in sidebar ── */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-3 right-3 z-10 p-1.5 bg-gray-700 rounded-lg text-gray-300 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          <div className="h-full w-64">
            <SidebarContent />
          </div>
        </div>
      </div>

      {/* ── Mobile: bottom navigation bar ── */}
      {bottomItems.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-700 flex safe-area-bottom">
          {bottomItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            const hasBadge = (label === 'Approvals' && pendingCount && pendingCount > 0);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 relative ${
                  active ? 'text-blue-400' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
