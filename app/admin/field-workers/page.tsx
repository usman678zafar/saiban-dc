import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import FieldWorkerManager, { FieldWorkerListItem } from '@/components/field-worker-manager';
import { fieldWorkerProjects } from '@/lib/field-workers';

const PAGE_SIZE = 10;

type FieldWorker = {
  id: string;
  fieldWorkerId: string | null;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  project: string | null;
  selfRegistered: boolean;
  createdAt: Date;
};

type SourceFilter = 'all' | 'admin' | 'self';

export default async function AdminFieldWorkersPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    q?: string;
    project?: string;
    source?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/field-workers');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.q?.trim() ?? '';
  const project = fieldWorkerProjects.includes(searchParams.project as (typeof fieldWorkerProjects)[number]) ? searchParams.project! : 'all';
  const source: SourceFilter = searchParams.source === 'admin' || searchParams.source === 'self' ? searchParams.source : 'all';

  const where = {
    role: 'field_worker' as const,
    ...(project !== 'all' ? { project } : {}),
    ...(source === 'admin' ? { selfRegistered: false } : {}),
    ...(source === 'self' ? { selfRegistered: true } : {}),
    ...(search
      ? {
          OR: [
            { fieldWorkerId: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { phoneNumber: { contains: search, mode: 'insensitive' as const } },
            { cnic: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } },
            { project: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * PAGE_SIZE;
  const [fieldWorkers, total, totalAll, adminCount, selfCount, projectCounts] = await Promise.all([
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
        project: true,
        selfRegistered: true,
        createdAt: true,
      },
    }) as Promise<FieldWorker[]>,
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: 'field_worker' } }),
    prisma.user.count({ where: { role: 'field_worker', selfRegistered: false } }),
    prisma.user.count({ where: { role: 'field_worker', selfRegistered: true } }),
    Promise.all(
      fieldWorkerProjects.map(async (projectName) => ({
        project: projectName,
        count: await prisma.user.count({ where: { role: 'field_worker', project: projectName } }),
      })),
    ),
  ]);

  const workers: FieldWorkerListItem[] = fieldWorkers.map((worker) => ({
    ...worker,
    createdAt: worker.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Field Workers</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Filter workers, manage project assignments, and control who can access the mobile collection portal.
        </p>
      </header>

      <FieldWorkerManager
        initialWorkers={workers}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
        filters={{ search, project, source }}
        counts={{ totalAll, admin: adminCount, self: selfCount, projects: projectCounts }}
      />
    </AdminShell>
  );
}
