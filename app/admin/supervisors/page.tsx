import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import AdminShell from '@/components/admin-shell';
import SupervisorManager, { SupervisorListItem } from '@/components/supervisor-manager';

export default async function AdminSupervisorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/supervisors');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  const [supervisors, projects] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.supervisor },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        cnic: true,
        address: true,
        project: true,
        supervisorDepartments: {
          orderBy: { project: 'asc' },
          select: { project: true },
        },
        createdAt: true,
      },
    }),
    getFieldWorkerProjectOptions(),
  ]);

  const items: SupervisorListItem[] = supervisors.map((supervisor) => ({
    ...supervisor,
    projects: supervisor.supervisorDepartments.length
      ? supervisor.supervisorDepartments.map((department) => department.project)
      : supervisor.project ? [supervisor.project] : [],
    createdAt: supervisor.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Supervisors</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Add supervisors and assign each one to one or more departments.
        </p>
      </header>

      <SupervisorManager supervisors={items} projects={projects} />
    </AdminShell>
  );
}





