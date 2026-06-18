'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, UserPlus, Upload, List,
  Building2, BarChart2, Settings, LogOut, Shield, Users, Activity,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

type Role = string;
type NavItem = { label: string; href: string; icon: React.ElementType };

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/',            icon: LayoutDashboard },
  { label: 'New Entry',    href: '/new-entry',   icon: UserPlus },
  { label: 'Bulk Upload',  href: '/bulk-upload', icon: Upload },
  { label: 'Entry List',   href: '/entry-list',  icon: List },
  { label: 'Reports',      href: '/reports',     icon: BarChart2 },
  { label: 'Activity Log', href: '/activity',    icon: Activity },
  { label: 'Users',        href: '/users',       icon: Users },
  { label: 'Settings',     href: '/settings',    icon: Settings },
];

const TA_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/',            icon: LayoutDashboard },
  { label: 'New Entry',    href: '/new-entry',   icon: UserPlus },
  { label: 'Bulk Upload',  href: '/bulk-upload', icon: Upload },
  { label: 'Entry List',   href: '/entry-list',  icon: List },
  { label: 'Reports',      href: '/reports',     icon: BarChart2 },
  { label: 'Activity Log', href: '/activity',    icon: Activity },
];

const FACILITIES_NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/',            icon: LayoutDashboard },
  { label: 'Approvals',  href: '/approvals',   icon: Building2 },
  { label: 'Entry List', href: '/entry-list',  icon: List },
  { label: 'Reports',    href: '/reports',     icon: BarChart2 },
];

const BOTTOM_NAV_ADMIN: NavItem[] = [
  { label: 'Dashboard', href: '/',            icon: LayoutDashboard },
  { label: 'New Entry', href: '/new-entry',   icon: UserPlus },
  { label: 'Approvals', href: '/approvals',   icon: Building2 },
  { label: 'List',      href: '/entry-list',  icon: List },
];

const BOTTOM_NAV_TA: NavItem[] = [
  { label: 'Dashboard', href: '/',            icon: LayoutDashboard },
  { label: 'New Entry', href: '/new-entry',   icon: UserPlus },
  { label: 'List',      href: '/entry-list',  icon: List },
  { label: 'Reports',   href: '/reports',     icon: BarChart2 },
];

const BOTTOM_NAV_FACILITIES: NavItem[] = [
  { label: 'Dashboard', href: '/',            icon: LayoutDashboard },
  { label: 'Approvals', href: '/approvals',   icon: Building2 },
  { label: 'List',      href: '/entry-list',  icon: List },
  { label: 'Reports',   href: '/reports',     icon: BarChart2 },
];

function navFor(role: Role): NavItem[] {
  if (role === 'admin')      return ADMIN_NAV;
  if (role === 'ta')         return TA_NAV;
  if (role === 'facilities') return FACILITIES_NAV;
  return [];
}

function bottomNavFor(role: Role): NavItem[] {
  if (role === 'admin')      return BOTTOM_NAV_ADMIN;
  if (role === 'ta')         return BOTTOM_NAV_TA;
  if (role === 'facilities') return BOTTOM_NAV_FACILITIES;
  return [];
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:      { label: 'Admin',           cls: 'bg-purple-900 text-purple-300' },
  ta:         { label: 'TA / HR Team',    cls: 'bg-blue-900   text-blue-300'   },
  facilities: { label: 'Facilities Team', cls: 'bg-teal-900   text-teal-300'   },
  staff:      { label: 'Staff',           cls: 'bg-green-900  text-green-300'  },
  intern:     { label: 'Intern',          cls: 'bg-amber-900  text-amber-300'  },
  other:      { label: 'Other',           cls: 'bg-gray-700   text-gray-300'   },
};

// ─── Tooltip shown next to collapsed icons ────────────────────────────────────

function NavTooltip({ label }: { label: string }) {
  return (
    <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap shadow-lg border border-gray-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[60]">
      {label}
    </span>
  );
}

// ─── Sidebar panel (top-level component, not nested) ─────────────────────────

interface PanelProps {
  navItems: NavItem[];
  pathname: string;
  pendingCount?: number;
  pendingUsersCount?: number;
  userName?: string;
  badge: { label: string; cls: string };
  collapsed: boolean;
  isMobile: boolean;
  onToggle?: () => void;
  onClose: () => void;
  onLogout: () => void;
}

function SidebarPanel({
  navItems, pathname, pendingCount, pendingUsersCount,
  userName, badge, collapsed, isMobile, onToggle, onClose, onLogout,
}: PanelProps) {
  const isCollapsedMode = !isMobile && collapsed;

  return (
    <aside
      className={`${isMobile ? 'w-60' : isCollapsedMode ? 'w-14' : 'w-44'} h-full bg-gray-900 text-white flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out`}
    >
      {/* ── Header: logo + toggle ── */}
      <div className={`border-b border-gray-700 flex items-center ${isCollapsedMode ? 'px-2 py-2.5 justify-center flex-col gap-2' : 'px-3 py-2 justify-between'}`}>
        {isCollapsedMode ? (
          <Link href="/" className="w-8 h-8 bg-white rounded-md flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0">
            <Shield size={16} className="text-blue-700" />
          </Link>
        ) : (
          <Link href="/" className="inline-block" onClick={isMobile ? onClose : undefined}>
            <div className="bg-white rounded-md px-2 py-1 hover:opacity-90 transition-opacity">
              <img
                src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
                alt="NxtWave"
                className="h-4 w-auto object-contain"
              />
            </div>
          </Link>
        )}

        {isMobile ? (
          <button onClick={onClose} className="p-1.5 bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors" aria-label="Close menu">
            <X size={18} />
          </button>
        ) : onToggle && (
          <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={`flex-1 py-2 ${isCollapsedMode ? 'px-1.5' : ''}`}>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active          = pathname === href || (href !== '/' && pathname.startsWith(href));
          const hasPendingBadge = label === 'Approvals' && pendingCount && pendingCount > 0;
          const hasUsersBadge   = label === 'Users'     && pendingUsersCount && pendingUsersCount > 0;

          if (isCollapsedMode) {
            return (
              <div key={href} className="relative group mb-0.5">
                <Link href={href}
                  className={`flex items-center justify-center p-2.5 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                >
                  <Icon size={18} />
                  {hasPendingBadge && (
                    <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold">{pendingCount}</span>
                  )}
                  {hasUsersBadge && (
                    <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold">{pendingUsersCount}</span>
                  )}
                </Link>
                <NavTooltip label={`${label}${hasPendingBadge ? ` (${pendingCount})` : ''}${hasUsersBadge ? ` (${pendingUsersCount})` : ''}`} />
              </div>
            );
          }

          return (
            <Link key={href} href={href} onClick={isMobile ? onClose : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
              {hasPendingBadge && (
                <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold flex-shrink-0">{pendingCount}</span>
              )}
              {hasUsersBadge && (
                <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold flex-shrink-0">{pendingUsersCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Promo banner (hidden when collapsed on desktop) ── */}
      {!isCollapsedMode && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 bg-blue-900/40 rounded-lg px-3 py-2">
            <Shield size={13} className="text-blue-400 flex-shrink-0" />
            <p className="text-[10px] text-blue-300 leading-tight">Secure Every Entry</p>
          </div>
        </div>
      )}

      {/* ── User + Logout ── */}
      {isCollapsedMode ? (
        <div className="border-t border-gray-700 py-3 flex flex-col items-center gap-1 px-1.5">
          <div className="relative group">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <NavTooltip label={userName ?? ''} />
          </div>
          <div className="relative group mt-1">
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" aria-label="Sign out">
              <LogOut size={16} />
            </button>
            <NavTooltip label="Sign out" />
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-700 px-4 py-4 space-y-2">
          {userName && (
            <div>
              <p className="text-xs text-white font-medium truncate">{userName}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
            </div>
          )}
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full mt-1 transition-colors">
            <LogOut size={15} /><span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
}

// ─── Main Sidebar component ───────────────────────────────────────────────────

export default function Sidebar({
  role, pendingCount, pendingUsersCount, userName, collapsed = false, onToggle,
}: {
  role: Role;
  pendingCount?: number;
  pendingUsersCount?: number;
  userName?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname    = usePathname();
  const router      = useRouter();
  const navItems    = navFor(role);
  const bottomItems = bottomNavFor(role);
  const badge       = ROLE_BADGE[role] ?? { label: role, cls: 'bg-gray-700 text-gray-300' };
  const [mobileOpen, setMobileOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const panelProps = {
    navItems,
    pathname,
    pendingCount,
    pendingUsersCount,
    userName,
    badge,
    onToggle,
    onLogout: handleLogout,
  };

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <div className={`hidden md:flex fixed top-0 left-0 h-screen z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-14' : 'w-44'}`}>
        <SidebarPanel {...panelProps} collapsed={collapsed} isMobile={false} onClose={() => {}} />
      </div>

      {/* ── Mobile: hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-gray-900 rounded-lg text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* ── Mobile: backdrop overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile: slide-in sidebar ── */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarPanel {...panelProps} collapsed={false} isMobile={true} onClose={() => setMobileOpen(false)} />
      </div>

      {/* ── Mobile: bottom navigation bar ── */}
      {bottomItems.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-700 flex safe-area-bottom">
          {bottomItems.map(({ label, href, icon: Icon }) => {
            const active   = pathname === href || (href !== '/' && pathname.startsWith(href));
            const hasBadge = label === 'Approvals' && pendingCount && pendingCount > 0;
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] relative transition-colors ${active ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">{pendingCount}</span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium leading-tight">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
