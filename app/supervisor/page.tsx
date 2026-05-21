import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Search, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { collectorProjectReviewWhere } from '@/lib/field-workers';
import { applicationSearchWhere } from '@/lib/application-search';
import { formatDate } from '@/lib/date-format';

export const dynamic = 'force-dynamic';

export default async function SupervisorPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/supervisor');
  if (session.user.role !== 'supervisor' && session.user.role !== 'admin') redirect('/applications');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { project: true, role: true },
  });

  const project = user?.role === 'admin' ? undefined : user?.project;
  if (user?.role !== 'admin' && !project) {
    return (
      <AppShell title="Supervisor Review" description="Your supervisor account needs a department assignment before applications can appear.">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ask an admin to assign your supervisor account to a department.
        </div>
      </AppShell>
    );
  }

  const search = searchParams.q?.trim() ?? '';
  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    { status: 'submitted' },
    ...(project ? [collectorProjectReviewWhere(project)] : []),
    ...(search ? [applicationSearchWhere(search)] : []),
  ];

  const applications = await prisma.orphanApplication.findMany({
    where: {
      AND: whereParts,
    },
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true,
      registrationNumber: true,
      childName: true,
      collectorName: true,
      collectorProject: true,
      updatedAt: true,
      status: true,
    },
  });

  return (
    <AppShell
      title="Supervisor Review"
      description={project ? `Applications submitted for ${project}.` : 'All submitted applications.'}
      maxWidth="max-w-6xl"
    >
      <form action="/supervisor" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search by name, registration, B-form, CNIC, department"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Search
          </button>
          {search ? (
            <Link href="/supervisor" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Collector</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No submitted applications for review.</td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                      <div className="mt-1 text-xs text-slate-500">{application.childName ?? 'No child name'}</div>
                    </td>
                    <td className="px-4 py-4">{application.collectorProject ?? '-'}</td>
                    <td className="px-4 py-4">{application.collectorName ?? '-'}</td>
                    <td className="px-4 py-4">{applicationStatusLabel(application.status)}</td>
                    <td className="px-4 py-4 text-slate-500">{formatDate(application.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <Link href={`/supervisor/applications/${application.id}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {applications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No submitted applications for review.</p>
          ) : (
            applications.map((application) => (
              <Link key={application.id} href={`/supervisor/applications/${application.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                <div className="mt-1 text-sm text-slate-600">{application.childName ?? 'No child name'}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{application.collectorProject ?? '-'}</span>
                  <span>{formatDate(application.updatedAt)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}






