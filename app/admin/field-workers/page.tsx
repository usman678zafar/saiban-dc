import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import FieldWorkerManager, { FieldWorkerListItem } from '@/components/field-worker-manager';
import { projectReviewValues } from '@/lib/field-workers';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';

const PAGE_SIZE = 10;

type FieldWorker = {
  id: string;
  fieldWorkerId: string | null;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  reference: string | null;
  project: string | null;
  supervisorId: string | null;
  supervisor: {
    id: string;
    name: string | null;
    phoneNumber: string | null;
    project: string | null;
    supervisorDepartments: Array<{ project: string }>;
  } | null;
  selfRegistered: boolean;
  createdAt: Date;
};

type SourceFilter = 'all' | 'admin' | 'self';

function fieldWorkerProjectWhere(project: string): Prisma.UserWhereInput {
  if (project === 'Self Registered') {
    return {
      OR: [
        { project: { in: projectReviewValues(project) } },
        { project: '' },
        { project: null },
        { selfRegistered: true },
      ],
    };
  }

  return { project: { in: projectReviewValues(project) } };
}

export default async function AdminFieldWorkersPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    q?: string;
    project?: string;
    supervisor?: string;
    source?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/field-workers');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.q?.trim() ?? '';
  const projects = await getFieldWorkerProjectOptions();
  const project = projects.includes(searchParams.project ?? '') ? searchParams.project! : 'all';
  const supervisor = searchParams.supervisor?.trim() || 'all';
  const source: SourceFilter = searchParams.source === 'admin' || searchParams.source === 'self' ? searchParams.source : 'all';

  const projectFilter = project !== 'all' ? fieldWorkerProjectWhere(project) : undefined;
  const searchFilter: Prisma.UserWhereInput | undefined = search
    ? {
        OR: [
          { fieldWorkerId: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { phoneNumber: { contains: search, mode: 'insensitive' as const } },
          { cnic: { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
          { reference: { contains: search, mode: 'insensitive' as const } },
          { project: { contains: search, mode: 'insensitive' as const } },
          { supervisor: { is: { name: { contains: search, mode: 'insensitive' as const } } } },
          { supervisor: { is: { phoneNumber: { contains: search, mode: 'insensitive' as const } } } },
        ],
      }
    : undefined;
  const andFilters = [projectFilter, searchFilter].filter(Boolean) as Prisma.UserWhereInput[];

  const where: Prisma.UserWhereInput = {
    role: 'field_worker' as const,
    ...(supervisor !== 'all' ? { supervisorId: supervisor } : {}),
    ...(source === 'admin' ? { selfRegistered: false } : {}),
    ...(source === 'self' ? { selfRegistered: true } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  };

  const skip = (page - 1) * PAGE_SIZE;
  const [fieldWorkers, supervisors, total, totalAll, adminCount, selfCount, projectCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        fieldWorkerId: true,
        name: true,
        phoneNumber: true,
        cnic: true,
        address: true,
        reference: true,
        project: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            project: true,
            supervisorDepartments: {
              orderBy: { project: 'asc' },
              select: { project: true },
            },
          },
        },
        selfRegistered: true,
        createdAt: true,
      },
    }) as Promise<FieldWorker[]>,
    prisma.user.findMany({
      where: { role: 'supervisor' },
      orderBy: [{ project: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        project: true,
        supervisorDepartments: {
          orderBy: { project: 'asc' },
          select: { project: true },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: 'field_worker' } }),
    prisma.user.count({ where: { role: 'field_worker', selfRegistered: false } }),
    prisma.user.count({ where: { role: 'field_worker', selfRegistered: true } }),
    Promise.all(
      projects.filter((projectName) => projectName !== 'Self Registered').map(async (projectName) => ({
        project: projectName,
        count: await prisma.user.count({ where: { role: 'field_worker', ...fieldWorkerProjectWhere(projectName) } }),
      })),
    ),
  ]);

  const workers: FieldWorkerListItem[] = fieldWorkers.map((worker) => ({
    ...worker,
    createdAt: worker.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Field Workers</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Filter workers, manage department assignments, and control who can access the mobile collection portal.
        </p>
      </header>

      <FieldWorkerManager
        initialWorkers={workers}
        supervisors={supervisors}
        projects={projects}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
        filters={{ search, project, supervisor, source }}
        counts={{ totalAll, admin: adminCount, self: selfCount, projects: projectCounts }}
      />
    </AdminShell>
  );
}







