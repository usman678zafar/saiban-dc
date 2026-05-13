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
          <h1 className="text-3xl font-semibold tracking-tight text-[#0f1f33]">Application Review</h1>
          <p className="mt-2 text-sm text-[#5f718a]">Review submitted records and open applications that need admin attention.</p>
        </div>
        <Link href="/admin/applications/new" className="rounded-xl bg-[#3b82f6] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2563eb]">
          New Application
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="grid gap-3 p-3 md:hidden">
          {applications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a9bb3]">No applications found.</p>
          ) : (
            applications.map((application: ApplicationListItem) => (
              <Link key={application.id} href={`/admin/applications/${application.id}`} className="rounded-xl border border-[#edf2f7] bg-white p-4 hover:bg-[#f8fbff]">
                <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                <div className="mt-1 text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-[#edf4ff] px-2 py-1 font-semibold capitalize text-[#2563eb]">{application.status}</span>
                  <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold capitalize text-[#506784]">{application.migrationStatus}</span>
                </div>
                <p className="mt-3 text-xs text-[#8a9bb3]">Updated {application.updatedAt.toLocaleDateString()}</p>
              </Link>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm text-[#506784]">
          <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
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
                <td colSpan={5} className="px-4 py-8 text-center text-[#8a9bb3]">No applications found.</td>
              </tr>
            ) : (
              applications.map((application: ApplicationListItem) => (
                <tr key={application.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                    <div className="text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                  </td>
                  <td className="px-4 py-4 capitalize">{application.status}</td>
                  <td className="px-4 py-4 capitalize">{application.migrationStatus}</td>
                  <td className="px-4 py-4 text-[#8a9bb3]">{application.updatedAt.toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <Link href={`/admin/applications/${application.id}`} className="rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff]">
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </AdminShell>
  );
}
