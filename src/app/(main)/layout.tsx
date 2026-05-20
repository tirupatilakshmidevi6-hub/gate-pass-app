import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import { getPendingEntries } from '@/lib/db';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const h        = await headers();
  const role     = h.get('x-user-role') as 'admin' | 'facilities' | null;
  const userName = h.get('x-user-name') ?? 'User';

  if (!role) redirect('/login');

  const pending = role === 'facilities' ? await getPendingEntries() : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} pendingCount={pending.length} userName={userName} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav userName={userName} role={role} pendingCount={pending.length} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
