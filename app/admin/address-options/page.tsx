import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import AddressOptionManager from '@/components/address-option-manager';

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
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Locations</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Add approved district and tehsil options for the application home step.
        </p>
      </header>

      <AddressOptionManager options={options} />
    </AdminShell>
  );
}
