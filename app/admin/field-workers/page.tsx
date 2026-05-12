import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import FieldWorkerForm from '@/components/field-worker-form';

type FieldWorker = {
  id: string;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
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
      name: true,
      phoneNumber: true,
      cnic: true,
      createdAt: true,
    },
  }) as FieldWorker[];

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Field Workers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Manage Field Workers</h1>
        <p className="mt-2 text-sm text-slate-600">Add field workers and review who can access the mobile collection portal.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add Field Worker</h2>
          <p className="mt-1 text-sm text-slate-600">Password defaults to the last four digits of the phone number.</p>
          <FieldWorkerForm />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Current Field Workers</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {fieldWorkers.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No field workers yet.</p>
            ) : (
              fieldWorkers.map((worker: FieldWorker) => (
                <div key={worker.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_180px_180px_120px] sm:items-center">
                  <p className="text-sm font-semibold text-slate-900">{worker.name ?? 'Unnamed worker'}</p>
                  <p className="text-sm text-slate-600">{worker.phoneNumber ?? '-'}</p>
                  <p className="text-sm text-slate-600">{worker.cnic ?? '-'}</p>
                  <p className="text-xs text-slate-500">{worker.createdAt.toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
