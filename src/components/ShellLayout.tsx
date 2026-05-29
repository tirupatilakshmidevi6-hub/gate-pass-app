'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface Props {
  children: React.ReactNode;
  role: string;
  userName: string;
  pendingCount: number;
  pendingUsersCount: number;
}

export default function ShellLayout({ children, role, userName, pendingCount, pendingUsersCount }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    } else {
      // Default: collapsed on tablet (< 1024px), expanded on desktop
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleToggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  // Use mounted to prevent hydration mismatch — server always renders expanded
  const effectiveCollapsed = mounted ? collapsed : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        role={role}
        pendingCount={pendingCount}
        pendingUsersCount={pendingUsersCount}
        userName={userName}
        collapsed={effectiveCollapsed}
        onToggle={handleToggle}
      />
      <div
        style={{ transition: 'margin-left 300ms ease-in-out' }}
        className={`flex flex-col min-h-screen ${effectiveCollapsed ? 'md:ml-16' : 'md:ml-56'}`}
      >
        <TopNav userName={userName} role={role as 'admin' | 'ta' | 'facilities'} pendingCount={pendingCount} />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
