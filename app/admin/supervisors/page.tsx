import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import AdminShell from '@/components/admin-shell';
import SupervisorManager, { SupervisorListItem } from '@/components/supervisor-manager';
import AdminManagementTabs from '@/components/admin-management-tabs';

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
        canCreateApplications: true,
        canManageFieldWorkers: true,
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
      <AdminManagementTabs active="supervisors" isSuperAdmin={session.user.role === 'super_admin'} />
      <SupervisorManager supervisors={items} projects={projects} />
    </AdminShell>
  );
}





