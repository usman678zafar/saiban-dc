import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import AddressOptionManager from '@/components/address-option-manager';
import AdminManagementTabs from '@/components/admin-management-tabs';

export default async function AdminAddressOptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/address-options');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  const options = await prisma.addressOption.findMany({
    orderBy: [{ province: 'asc' }, { district: 'asc' }, { type: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      type: true,
      province: true,
      district: true,
      name: true,
    },
  });

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <AdminManagementTabs active="locations" isSuperAdmin={session.user.role === 'super_admin'} />
      <AddressOptionManager options={options} />
    </AdminShell>
  );
}
