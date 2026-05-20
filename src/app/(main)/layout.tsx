import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getPendingEntries } from '@/lib/db';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const role = h.get('x-user-role') as 'admin' | 'facilities' | null;
  const userName = h.get('x-user-name') ?? 'User';

  if (!role) {
    redirect('/login');
  }

  const pending = role === 'facilities' ? await getPendingEntries() : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} pendingCount={pending.length} userName={userName} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">NxtWave Gate Pass System</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="hidden sm:inline">{userName}</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
