import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import SupervisorManager, { SupervisorListItem } from '@/components/supervisor-manager';

export default async function AdminSupervisorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/supervisors');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const supervisors = await prisma.user.findMany({
    where: { role: UserRole.supervisor },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      project: true,
      createdAt: true,
    },
  });

  const items: SupervisorListItem[] = supervisors.map((supervisor) => ({
    ...supervisor,
    createdAt: supervisor.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Supervisors</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Add supervisors and assign each one to Link Road, Talagang, Schools, Volunteer, or Self Registered.
        </p>
      </header>

      <SupervisorManager supervisors={items} />
    </AdminShell>
  );
}
