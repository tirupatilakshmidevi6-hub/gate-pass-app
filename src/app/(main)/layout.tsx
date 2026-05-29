import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import ShellLayout from '@/components/ShellLayout';
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
    <ShellLayout
      role={role}
      userName={userName}
      pendingCount={pending.length}
      pendingUsersCount={pendingUsersCount}
    >
      {children}
    </ShellLayout>
  );
}
