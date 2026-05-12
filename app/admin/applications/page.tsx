import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';

type ApplicationListItem = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  migrationStatus: string;
  updatedAt: Date;
};

export default async function AdminApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const applications = await prisma.orphanApplication.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 25,
    select: {
      id: true,
      registrationNumber: true,
      childName: true,
      status: true,
      migrationStatus: true,
      updatedAt: true,
    },
  }) as ApplicationListItem[];

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Applications</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Application Review</h1>
          <p className="mt-2 text-sm text-slate-600">Review submitted records and open applications that need admin attention.</p>
        </div>
        <Link href="/admin/applications/new" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
          New Application
        </Link>
      </header>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No applications found.</td>
              </tr>
            ) : (
              applications.map((application: ApplicationListItem) => (
                <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                    <div className="text-xs text-slate-500">{application.childName ?? 'No child name'}</div>
                  </td>
                  <td className="px-4 py-4 capitalize">{application.status}</td>
                  <td className="px-4 py-4 capitalize">{application.migrationStatus}</td>
                  <td className="px-4 py-4 text-slate-500">{application.updatedAt.toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <Link href={`/admin/applications/${application.id}`} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200">
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
