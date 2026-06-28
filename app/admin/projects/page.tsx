import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fieldWorkerProjects } from '@/lib/field-workers';
import AdminShell from '@/components/admin-shell';
import ProjectManager from '@/components/project-manager';
import AdminManagementTabs from '@/components/admin-management-tabs';

export default async function AdminDepartmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/projects');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  const customDepartments = await prisma.projectOption.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  const defaultDepartments = fieldWorkerProjects.map((name) => ({
    id: `default:${name}`,
    name,
    isDefault: true,
  }));

  const customItems = customDepartments
    .filter((project) => !fieldWorkerProjects.includes(project.name as (typeof fieldWorkerProjects)[number]))
    .map((project) => ({
      id: project.id,
      name: project.name,
      isDefault: false,
      createdAt: project.createdAt.toISOString(),
    }));

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <AdminManagementTabs active="departments" isSuperAdmin={session.user.role === 'super_admin'} />
      <ProjectManager projects={[...defaultDepartments, ...customItems]} />
    </AdminShell>
  );
}

