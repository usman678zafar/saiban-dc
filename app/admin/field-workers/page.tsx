import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import FieldWorkerManager, { FieldWorkerListItem } from '@/components/field-worker-manager';

type FieldWorker = {
  id: string;
  fieldWorkerId: string | null;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  project: string | null;
  createdAt: Date;
};

export default async function AdminFieldWorkersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/field-workers');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const fieldWorkers = await prisma.user.findMany({
    where: { role: 'field_worker' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fieldWorkerId: true,
      name: true,
      phoneNumber: true,
      cnic: true,
      address: true,
      project: true,
      createdAt: true,
    },
  }) as FieldWorker[];

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

      <FieldWorkerManager initialWorkers={workers} />
    </AdminShell>
  );
}
