import Link from 'next/link';
import { ApplicationStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import { applicationStatusLabel } from '@/lib/application-workflow';

const PAGE_SIZE = 50;
const adminVisibleApplicationWhere = {
  status: {
    in: ['supervisor_approved', 'admin_approved', 'validated', 'rejected', 'migrated'] as ApplicationStatus[],
  },
};

type ApplicationListItem = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  migrationStatus: string;
  updatedAt: Date;
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [applications, total] = await Promise.all([
    prisma.orphanApplication.findMany({
      where: adminVisibleApplicationWhere,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        migrationStatus: true,
        updatedAt: true,
      },
    }) as Promise<ApplicationListItem[]>,
    prisma.orphanApplication.count({ where: adminVisibleApplicationWhere }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
                  <span className="rounded-lg bg-[#edf4ff] px-2 py-1 font-semibold text-[#2563eb]">{applicationStatusLabel(application.status)}</span>
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
                    <td className="px-4 py-4">{applicationStatusLabel(application.status)}</td>
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

        <div className="flex items-center justify-between border-t border-[#edf2f7] px-4 py-3 text-sm text-[#5f718a]">
          <span>{total === 0 ? 'No records' : `Showing ${skip + 1}–${Math.min(skip + PAGE_SIZE, total)} of ${total}`}</span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link href={`/admin/applications?page=${page - 1}`} className="rounded-lg border border-[#dbe4ef] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f9fd]">
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-3 py-1.5 text-xs font-semibold text-[#c2d0e0]">Previous</span>
            )}
            {hasNext ? (
              <Link href={`/admin/applications?page=${page + 1}`} className="rounded-lg border border-[#dbe4ef] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f9fd]">
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-3 py-1.5 text-xs font-semibold text-[#c2d0e0]">Next</span>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
