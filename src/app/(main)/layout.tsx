import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import { getPendingEntries, getPendingApprovalCount } from '@/lib/db';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const h        = await headers();
  const role     = h.get('x-user-role');
  const userName = h.get('x-user-name') ?? 'User';

  if (!role) redirect('/login');

  const [pending, pendingUsersCount] = await Promise.all([
    role === 'facilities' ? getPendingEntries() : Promise.resolve([]),
    role === 'admin'      ? getPendingApprovalCount() : Promise.resolve(0),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} pendingCount={pending.length} pendingUsersCount={pendingUsersCount} userName={userName} />
      {/* Desktop: offset by sidebar width. Mobile: full width with top padding for hamburger button */}
      <div className="md:ml-56 flex flex-col min-h-screen">
        <TopNav userName={userName} role={role as 'admin' | 'ta' | 'facilities'} pendingCount={pending.length} />
        {/* Mobile: bottom padding for bottom nav bar */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
