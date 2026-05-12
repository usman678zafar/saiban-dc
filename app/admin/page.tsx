import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SignOutButton from '@/components/sign-out-button';
import FieldWorkerForm from '@/components/field-worker-form';

type AdminMetric = {
  label: string;
  value: number;
};

type RecentApplication = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  migrationStatus: string;
  updatedAt: Date;
};

type FieldWorker = {
  id: string;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  createdAt: Date;
};

async function getAdminPortalData() {
  const [
    totalApplications,
    submittedApplications,
    validatedApplications,
    migratedApplications,
    rejectedApplications,
    totalUsers,
    adminUsers,
    fieldWorkers,
    recentApplications,
  ] = await Promise.all([
    prisma.orphanApplication.count(),
    prisma.orphanApplication.count({ where: { status: 'submitted' } }),
    prisma.orphanApplication.count({ where: { status: 'validated' } }),
    prisma.orphanApplication.count({ where: { status: 'migrated' } }),
    prisma.orphanApplication.count({ where: { status: 'rejected' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.findMany({
      where: { role: 'field_worker' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        cnic: true,
        createdAt: true,
      },
    }) as Promise<FieldWorker[]>,
    prisma.orphanApplication.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        migrationStatus: true,
        updatedAt: true,
      },
    }) as Promise<RecentApplication[]>,
  ]);

  const metrics: AdminMetric[] = [
    { label: 'Total Applications', value: totalApplications },
    { label: 'Submitted', value: submittedApplications },
    { label: 'Validated', value: validatedApplications },
    { label: 'Migrated', value: migratedApplications },
    { label: 'Rejected', value: rejectedApplications },
    { label: 'Users', value: totalUsers },
    { label: 'Admins', value: adminUsers },
  ];

  return { metrics, fieldWorkers, recentApplications };
}

export default async function AdminPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/admin/login?callbackUrl=/admin');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const { metrics, fieldWorkers, recentApplications } = await getAdminPortalData();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Admin Portal</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Saiban Control Center</h1>
            <p className="mt-2 text-sm text-slate-600">Signed in as {session.user.email}. Manage application review, exports, and migration work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/applications" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Applications
            </Link>
            <Link href="/applications/new" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              New Application
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {metrics.map((metric: AdminMetric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-slate-900">Recent Applications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Migration</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No applications found.</td>
                    </tr>
                  ) : (
                    recentApplications.map((application: RecentApplication) => (
                      <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                          <div className="text-xs text-slate-500">{application.childName ?? 'No child name'}</div>
                        </td>
                        <td className="px-4 py-4 capitalize">{application.status}</td>
                        <td className="px-4 py-4 capitalize">{application.migrationStatus}</td>
                        <td className="px-4 py-4 text-slate-500">{application.updatedAt.toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <Link href={`/applications/${application.id}`} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Add Field Worker</h2>
              <p className="mt-1 text-sm text-slate-600">Create login credentials for a field worker.</p>
              <FieldWorkerForm />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Field Workers</h2>
              <div className="mt-4 grid gap-3">
                {fieldWorkers.length === 0 ? (
                  <p className="text-sm text-slate-500">No field workers yet.</p>
                ) : (
                  fieldWorkers.map((worker: FieldWorker) => (
                    <div key={worker.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{worker.name ?? 'Unnamed worker'}</p>
                      <p className="mt-1 text-sm text-slate-600">Phone: {worker.phoneNumber ?? '-'}</p>
                      <p className="mt-1 text-sm text-slate-600">CNIC: {worker.cnic ?? '-'}</p>
                      <p className="mt-2 text-xs text-slate-500">Added {worker.createdAt.toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Admin Actions</h2>
              <div className="mt-4 grid gap-3">
                <Link href="/api/applications/export?format=csv" className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800">
                  Export CSV
                </Link>
                <Link href="/api/applications/export?format=json" className="rounded-2xl bg-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-300">
                  Export JSON
                </Link>
                <Link href="/dashboard" className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-200">
                  Field Dashboard
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
