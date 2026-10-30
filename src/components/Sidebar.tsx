'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FilePlus2, List,
  Building2, BarChart2, Settings, LogOut, Shield, Users, Activity,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

type Role = string;
type NavItem = { label: string; href: string; icon: React.ElementType };
type NavSection = { label?: string; items: NavItem[] };

// ─── Nav section definitions ──────────────────────────────────────────────────

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard',        href: '/',                  icon: LayoutDashboard },
      { label: 'Create Gate Pass', href: '/create-gate-pass', icon: FilePlus2       },
      { label: 'Gate Pass History',href: '/entry-list',        icon: List            },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports',      href: '/reports',  icon: BarChart2 },
      { label: 'Activity Log', href: '/activity', icon: Activity  },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users',    href: '/users',    icon: Users    },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const TA_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard',        href: '/',                  icon: LayoutDashboard },
      { label: 'Create Gate Pass', href: '/create-gate-pass', icon: FilePlus2       },
      { label: 'Gate Pass History',href: '/entry-list',        icon: List            },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports',      href: '/reports',  icon: BarChart2 },
      { label: 'Activity Log', href: '/activity', icon: Activity  },
    ],
  },
];

const FACILITIES_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard',        href: '/',          icon: LayoutDashboard },
      { label: 'Approvals',        href: '/approvals', icon: Building2       },
      { label: 'Gate Pass History',href: '/entry-list',icon: List            },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart2 },
    ],
  },
];

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

const BOTTOM_NAV_ADMIN: NavItem[] = [
  { label: 'Dashboard', href: '/',                 icon: LayoutDashboard },
  { label: 'Create',    href: '/create-gate-pass', icon: FilePlus2       },
  { label: 'Approvals', href: '/approvals',        icon: Building2       },
  { label: 'List',      href: '/entry-list',       icon: List            },
];

const BOTTOM_NAV_TA: NavItem[] = [
  { label: 'Dashboard', href: '/',                 icon: LayoutDashboard },
  { label: 'Create',    href: '/create-gate-pass', icon: FilePlus2       },
  { label: 'List',      href: '/entry-list',       icon: List            },
  { label: 'Reports',   href: '/reports',          icon: BarChart2       },
];

const BOTTOM_NAV_FACILITIES: NavItem[] = [
  { label: 'Dashboard', href: '/',           icon: LayoutDashboard },
  { label: 'Approvals', href: '/approvals',  icon: Building2       },
  { label: 'List',      href: '/entry-list', icon: List            },
  { label: 'Reports',   href: '/reports',    icon: BarChart2       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectionsFor(role: Role): NavSection[] {
  if (role === 'admin')      return ADMIN_SECTIONS;
  if (role === 'ta')         return TA_SECTIONS;
  if (role === 'facilities') return FACILITIES_SECTIONS;
  return [];
}

function bottomNavFor(role: Role): NavItem[] {
  if (role === 'admin')      return BOTTOM_NAV_ADMIN;
  if (role === 'ta')         return BOTTOM_NAV_TA;
  if (role === 'facilities') return BOTTOM_NAV_FACILITIES;
  return [];
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:      { label: 'Admin',           cls: 'bg-blue-50  text-blue-700  border border-blue-100'  },
  ta:         { label: 'TA / HR Team',    cls: 'bg-slate-100 text-slate-700 border border-slate-200' },
  facilities: { label: 'Facilities Team', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  staff:      { label: 'Staff',           cls: 'bg-green-50 text-green-700 border border-green-100' },
  other:      { label: 'Other',           cls: 'bg-gray-100 text-gray-600  border border-gray-200'  },
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function NavTooltip({ label }: { label: string }) {
  return (
    <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-xl border border-gray-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[60]">
      {label}
    </span>
  );
}

// ─── Sidebar panel ────────────────────────────────────────────────────────────

interface PanelProps {
  sections:         NavSection[];
  pathname:         string;
  pendingCount?:    number;
  pendingUsersCount?: number;
  userName?:        string;
  badge:            { label: string; cls: string };
  collapsed:        boolean;
  isMobile:         boolean;
  onToggle?:        () => void;
  onClose:          () => void;
  onLogout:         () => void;
}

function SidebarPanel({
  sections, pathname, pendingCount, pendingUsersCount,
  userName, badge, collapsed, isMobile, onToggle, onClose, onLogout,
}: PanelProps) {
  const isCollapsed = !isMobile && collapsed;

  // Flatten all items for active-check
  const allItems = sections.flatMap((s) => s.items);

  function isActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  }

  return (
    <aside
      className={`app-sidebar ${isMobile ? 'w-60' : isCollapsed ? 'w-14' : 'w-44'} h-full flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out`}
    >
      {/* ── Header ── */}
      <div
        className={`app-sidebar-divider border-b flex items-center ${isCollapsed ? 'px-2 py-3 justify-center flex-col gap-2' : 'px-3 py-3 justify-between'} flex-shrink-0`}
      >
        {isCollapsed ? (
          <Link
            href="/"
            className="app-sidebar-logo w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Shield size={17} className="text-white" />
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2.5 group min-w-0"
            onClick={isMobile ? onClose : undefined}
          >
            <div
              className="app-sidebar-logo w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            >
              <Shield size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="app-sidebar-title text-[13px] font-bold leading-tight tracking-tight">NxtWave</div>
              <div className="app-sidebar-sub text-[10px] leading-tight font-medium">Gate Pass System</div>
            </div>
          </Link>
        )}

        {isMobile ? (
          <button
            onClick={onClose}
            className="app-sidebar-ghost icon-btn p-1.5 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : onToggle && (
          <button
            onClick={onToggle}
            className="app-sidebar-ghost icon-btn p-1 rounded-lg transition-colors flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={`flex-1 py-2 ${isCollapsed ? 'px-1.5' : 'px-1.5'}`}>
        {sections.map((section, si) => {
          // In collapsed desktop mode: no labels, just icons
          if (isCollapsed) {
            return (
              <div key={si} className="mb-1">
                {si > 0 && <div className="nav-section-divider my-1" />}
                {section.items.map(({ label, href, icon: Icon }) => {
                  const active          = isActive(href);
                  const hasPendingBadge = label === 'Approvals' && pendingCount && pendingCount > 0;
                  const hasUsersBadge   = label === 'Users'     && pendingUsersCount && pendingUsersCount > 0;
                  return (
                    <div key={href} className="relative group mb-0.5">
                      <Link
                        href={href}
                        className={`nav-item flex items-center justify-center p-2.5 rounded-lg ${
                          active ? 'nav-item-active' : ''
                        }`}
                      >
                        <Icon size={17} className="nav-icon" />
                        {hasPendingBadge && (
                          <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                            {pendingCount}
                          </span>
                        )}
                        {hasUsersBadge && (
                          <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                            {pendingUsersCount}
                          </span>
                        )}
                      </Link>
                      <NavTooltip
                        label={`${label}${hasPendingBadge ? ` (${pendingCount})` : ''}${hasUsersBadge ? ` (${pendingUsersCount})` : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            );
          }

          // Expanded mode: show section labels
          return (
            <div key={si} className="mb-1">
              {si > 0 && (
                <>
                  <div className="nav-section-divider" />
                  {section.label && (
                    <div className="nav-section-label">{section.label}</div>
                  )}
                </>
              )}
              {section.items.map(({ label, href, icon: Icon }) => {
                const active          = isActive(href);
                const hasPendingBadge = label === 'Approvals' && pendingCount && pendingCount > 0;
                const hasUsersBadge   = label === 'Users'     && pendingUsersCount && pendingUsersCount > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={isMobile ? onClose : undefined}
                    className={`nav-item nav-link group relative flex items-center gap-2.5 mx-0.5 px-2.5 py-2 text-[13px] rounded-lg mb-0.5 ${
                      active ? 'nav-item-active font-semibold' : 'font-medium'
                    }`}
                  >
                    <Icon size={15} className="nav-icon flex-shrink-0" />
                    <span className="truncate">{label}</span>
                    {hasPendingBadge && (
                      <span className="ml-auto bg-orange-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold flex-shrink-0 px-1">
                        {pendingCount}
                      </span>
                    )}
                    {hasUsersBadge && (
                      <span className="ml-auto bg-amber-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold flex-shrink-0 px-1">
                        {pendingUsersCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Security badge (expanded only) ── */}
      {!isCollapsed && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="app-sidebar-note flex items-center gap-2 rounded-lg px-3 py-2">
            <Shield size={12} className="flex-shrink-0" />
            <p className="text-[10.5px] font-medium leading-tight">Secure Every Entry</p>
          </div>
        </div>
      )}

      {/* ── User + logout ── */}
      {isCollapsed ? (
        <div
          className="app-sidebar-divider border-t py-3 flex flex-col items-center gap-2 px-1.5 flex-shrink-0"
        >
          <div className="relative group">
            <div
              className="app-sidebar-avatar w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            >
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <NavTooltip label={userName ?? ''} />
          </div>
          <div className="relative group">
            <button
              onClick={onLogout}
              className="app-sidebar-ghost app-sidebar-danger icon-btn p-2 rounded-lg transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
            <NavTooltip label="Sign out" />
          </div>
        </div>
      ) : (
        <div
          className="app-sidebar-divider border-t px-3 py-3 flex-shrink-0"
        >
          {userName && (
            <div className="flex items-center gap-2.5 mb-2.5 min-w-0">
              <div
                className="app-sidebar-avatar w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="app-sidebar-name text-xs font-semibold truncate leading-tight">{userName}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="app-sidebar-ghost app-sidebar-danger flex items-center gap-2 text-xs w-full transition-colors py-1 rounded-lg px-1"
          >
            <LogOut size={13} /><span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({
  role, pendingCount, pendingUsersCount, userName, collapsed = false, onToggle,
}: {
  role:               Role;
  pendingCount?:      number;
  pendingUsersCount?: number;
  userName?:          string;
  collapsed?:         boolean;
  onToggle?:          () => void;
}) {
  const pathname    = usePathname();
  const router      = useRouter();
  const sections    = sectionsFor(role);
  const bottomItems = bottomNavFor(role);
  const badge       = ROLE_BADGE[role] ?? { label: role, cls: 'bg-gray-800 text-gray-400' };
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
    sections,
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
      {/* Desktop sidebar */}
      <div className={`hidden md:flex fixed top-0 left-0 h-screen z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-14' : 'w-44'}`}>
        <SidebarPanel {...panelProps} collapsed={collapsed} isMobile={false} onClose={() => {}} />
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-in */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-60 z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarPanel {...panelProps} collapsed={false} isMobile={true} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Mobile bottom nav */}
      {bottomItems.length > 0 && (
        <nav
          className="app-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 flex safe-area-bottom"
        >
          {bottomItems.map(({ label, href, icon: Icon }) => {
            const active   = pathname === href || (href !== '/' && pathname.startsWith(href));
            const hasBadge = label === 'Approvals' && pendingCount && pendingCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] relative transition-colors ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <div className="relative">
                  <Icon size={19} />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-semibold leading-tight">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
