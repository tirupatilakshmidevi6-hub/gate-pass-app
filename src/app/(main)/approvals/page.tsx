import { headers } from 'next/headers';
import FacilitiesApprovals from '@/components/FacilitiesApprovals';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const h = await headers();
  const role = (h.get('x-user-role') ?? 'admin') as 'admin' | 'facilities';
  return <FacilitiesApprovals userRole={role} />;
}
