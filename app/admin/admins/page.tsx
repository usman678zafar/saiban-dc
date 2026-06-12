import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import AdminManager, { AdminListItem } from '@/components/admin-manager';

export default async function AdminAdminsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/admins');
  if (session.user.role !== 'super_admin') redirect('/admin');

  const admins = await prisma.user.findMany({
    where: { role: { in: [UserRole.admin, UserRole.viewer] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const items: AdminListItem[] = admins.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role === UserRole.viewer ? 'viewer' : 'admin',
    createdAt: admin.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Admins & Viewers</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Create and maintain admin and read-only viewer accounts. Super admin accounts are intentionally not editable here.
        </p>
      </header>

      <AdminManager admins={items} />
    </AdminShell>
  );
}
