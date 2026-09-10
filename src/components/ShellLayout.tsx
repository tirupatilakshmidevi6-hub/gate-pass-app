'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface Props {
  children:          React.ReactNode;
  role:              string;
  userName:          string;
  pendingCount:      number;
  pendingUsersCount: number;
}

export default function ShellLayout({ children, role, userName, pendingCount, pendingUsersCount }: Props) {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [animKey,   setAnimKey]   = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    } else {
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  useEffect(() => {
    setAnimKey((prev) => prev + 1);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  const effectiveCollapsed = mounted ? collapsed : false;

  return (
    <div className="min-h-screen gp-bg">
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
        className={`flex flex-col min-h-screen ${effectiveCollapsed ? 'md:ml-14' : 'md:ml-44'}`}
      >
        <TopNav userName={userName} role={role as 'admin' | 'ta' | 'facilities'} pendingCount={pendingCount} />
        <main key={animKey} className="flex-1 overflow-auto pb-16 md:pb-0 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
