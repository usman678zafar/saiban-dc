import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import AdminManager, { AdminListItem } from '@/components/admin-manager';
import AdminManagementTabs from '@/components/admin-management-tabs';

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
      <AdminManagementTabs active="admins" isSuperAdmin />
      <AdminManager admins={items} />
    </AdminShell>
  );
}
