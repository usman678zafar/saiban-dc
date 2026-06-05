import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SupervisorShell from '@/components/supervisor-shell';
import FieldWorkerManager, { FieldWorkerListItem } from '@/components/field-worker-manager';
import { projectReviewValues } from '@/lib/field-workers';

const PAGE_SIZE = 10;

type SourceFilter = 'all' | 'admin' | 'self';

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

export default async function SupervisorFieldWorkersPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    q?: string;
    project?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/supervisor/field-workers');
  if (session.user.role !== 'supervisor') redirect('/supervisor');

  const supervisor = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      project: true,
      canCreateApplications: true,
      canManageFieldWorkers: true,
      supervisorDepartments: {
        orderBy: { project: 'asc' },
        select: { project: true },
      },
    },
  });

  if (!supervisor?.canManageFieldWorkers) {
    return (
      <SupervisorShell email={session.user.email} name={supervisor?.name} canCreateApplications={supervisor?.canCreateApplications} canManageFieldWorkers={false}>
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Field Workers</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Your account does not have field worker management access.</p>
        </header>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ask an admin to enable field worker management for your supervisor account.
        </div>
      </SupervisorShell>
    );
  }

  const projects = supervisor.supervisorDepartments.length
    ? supervisor.supervisorDepartments.map((department) => department.project)
    : supervisor.project ? [supervisor.project] : [];

  if (projects.length === 0) {
    return (
      <SupervisorShell email={session.user.email} name={supervisor.name} canCreateApplications={supervisor.canCreateApplications} canManageFieldWorkers={supervisor.canManageFieldWorkers}>
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Field Workers</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Your supervisor account needs a department assignment before field workers can be managed.</p>
        </header>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ask an admin to assign your supervisor account to a department.
        </div>
      </SupervisorShell>
    );
  }

  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.q?.trim() ?? '';
  const project = projects.includes(searchParams.project ?? '') ? searchParams.project! : 'all';
  const projectFilter = project !== 'all' ? fieldWorkerProjectWhere(project) : { project: { in: projects } };
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
        ],
      }
    : undefined;

  const where: Prisma.UserWhereInput = {
    role: 'field_worker',
    supervisorId: supervisor.id,
    AND: [projectFilter, searchFilter].filter(Boolean) as Prisma.UserWhereInput[],
  };

  const skip = (page - 1) * PAGE_SIZE;
  const [fieldWorkers, total, projectCounts] = await Promise.all([
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
    prisma.user.count({ where }),
    Promise.all(projects.map(async (projectName) => ({
      project: projectName,
      count: await prisma.user.count({
        where: {
          role: 'field_worker',
          supervisorId: supervisor.id,
          ...fieldWorkerProjectWhere(projectName),
        },
      }),
    }))),
  ]);

  const workers: FieldWorkerListItem[] = fieldWorkers.map((worker) => ({
    ...worker,
    createdAt: worker.createdAt.toISOString(),
  }));
  const supervisorOption = {
    id: supervisor.id,
    name: supervisor.name,
    phoneNumber: supervisor.phoneNumber,
    project: supervisor.project,
    supervisorDepartments: supervisor.supervisorDepartments,
  };

  return (
    <SupervisorShell email={session.user.email} name={supervisor.name} canCreateApplications={supervisor.canCreateApplications} canManageFieldWorkers={supervisor.canManageFieldWorkers}>
      <header className="mb-5 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Field Workers</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Manage field workers assigned to {projects.join(', ')}.</p>
      </header>
      <FieldWorkerManager
        initialWorkers={workers}
        supervisors={[supervisorOption]}
        projects={projects}
        pagePath="/supervisor/field-workers"
        apiPath="/api/supervisor/field-workers"
        showSupervisorFilter={false}
        showSourceFilters={false}
        lockedSupervisorId={supervisor.id}
        heading="My Field Workers"
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
        filters={{ search, project, supervisor: 'all', source: 'all' as SourceFilter }}
        counts={{ totalAll: total, admin: 0, self: 0, projects: projectCounts }}
      />
    </SupervisorShell>
  );
}
