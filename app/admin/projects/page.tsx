import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fieldWorkerProjects } from '@/lib/field-workers';
import AdminShell from '@/components/admin-shell';
import ProjectManager from '@/components/project-manager';

export default async function AdminDepartmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/projects');
  if (session.user.role !== 'admin') redirect('/dashboard');

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
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Departments</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Add department names used when creating supervisors and assigning field workers.
        </p>
      </header>

      <ProjectManager projects={[...defaultDepartments, ...customItems]} />
    </AdminShell>
  );
}

