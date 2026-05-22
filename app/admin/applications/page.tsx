import Link from 'next/link';
import { ApplicationStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Search, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { applicationSearchWhere } from '@/lib/application-search';
import { formatDate } from '@/lib/date-format';

const PAGE_SIZE = 50;
const adminVisibleApplicationWhere = {
  status: {
    in: [
      ApplicationStatus.reviewer_approved,
      ApplicationStatus.admin_approved,
      ApplicationStatus.validated,
      ApplicationStatus.rejected,
      ApplicationStatus.migrated,
    ],
  },
};

function applicationWhereForRole(role?: string | null) {
  return role === 'super_admin' ? {} : adminVisibleApplicationWhere;
}

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
  searchParams: { page?: string; q?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');
  const isSuperAdmin = session.user.role === 'super_admin';

  const search = searchParams.q?.trim() ?? '';
  const searchWhere = applicationSearchWhere(search);
  const where = { ...applicationWhereForRole(session.user.role), ...searchWhere };
  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return query ? `/admin/applications?${query}` : '/admin/applications';
  };

  const [applications, total] = await Promise.all([
    prisma.orphanApplication.findMany({
      where,
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
    prisma.orphanApplication.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0f1f33]">Application Review</h1>
          <p className="mt-2 text-sm text-[#5f718a]">Review applications approved by reviewers and complete final admin decisions.</p>
        </div>
        <Link href="/admin/applications/new" className="rounded-xl bg-[#3b82f6] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2563eb]">
          New Application
        </Link>
      </header>

      <form action="/admin/applications" className="mb-4 rounded-xl border border-[#dbe4ef] bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9bb3]" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search by name, registration, B-form, CNIC, department"
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] pl-10 pr-3 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563eb]">
            Search
          </button>
          {search ? (
            <Link href="/admin/applications" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] px-4 py-2 text-sm font-semibold text-[#506784] hover:bg-[#f6f9fd]">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

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
                  {isSuperAdmin ? <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold capitalize text-[#506784]">{application.migrationStatus}</span> : null}
                </div>
                <p className="mt-3 text-xs text-[#8a9bb3]">Updated {formatDate(application.updatedAt)}</p>
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
                {isSuperAdmin ? <th className="px-4 py-3">Migration</th> : null}
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-8 text-center text-[#8a9bb3]">No applications found.</td>
                </tr>
              ) : (
                applications.map((application: ApplicationListItem) => (
                  <tr key={application.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                      <div className="text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                    </td>
                    <td className="px-4 py-4">{applicationStatusLabel(application.status)}</td>
                    {isSuperAdmin ? <td className="px-4 py-4 capitalize">{application.migrationStatus}</td> : null}
                    <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(application.updatedAt)}</td>
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
              <Link href={pageHref(page - 1)} className="rounded-lg border border-[#dbe4ef] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f9fd]">
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-3 py-1.5 text-xs font-semibold text-[#c2d0e0]">Previous</span>
            )}
            {hasNext ? (
              <Link href={pageHref(page + 1)} className="rounded-lg border border-[#dbe4ef] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f9fd]">
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




