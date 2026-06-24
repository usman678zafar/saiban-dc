import Link from 'next/link';
import { ApplicationStatus, type Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Search, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SupervisorShell from '@/components/supervisor-shell';
import { SameFamilyBadge } from '@/components/same-family-indicator';
import { applicationStatusLabel, badgeClass } from '@/lib/application-workflow';
import { collectorProjectsReviewWhere } from '@/lib/field-workers';
import { applicationSearchWhere } from '@/lib/application-search';
import { formatDate } from '@/lib/date-format';
import { getSameFamilySummaries, sameFamilyApplicationSelect } from '@/lib/same-family-applications';

export const dynamic = 'force-dynamic';

const supervisorViews = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'resubmitted', label: 'Resubmitted' },
  { value: 'returned', label: 'Returned' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All Statuses' },
] as const;

type SupervisorView = (typeof supervisorViews)[number]['value'];

const supervisorApprovedStatuses = [
  ApplicationStatus.supervisor_approved,
  ApplicationStatus.reviewer_approved,
  ApplicationStatus.admin_on_hold,
  ApplicationStatus.admin_approved,
  ApplicationStatus.validated,
  ApplicationStatus.migrated,
];

function supervisorPendingWhere(): Prisma.OrphanApplicationWhereInput {
  return {
    status: ApplicationStatus.submitted,
  };
}

function isTransientDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /connection terminated|connection closed|ECONNRESET|ECONNREFUSED|timeout/i.test(message);
}

async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
}

function supervisorViewWhere(
  view: SupervisorView,
  supervisorId?: string,
  isPrivilegedSupervisorView = false,
): Prisma.OrphanApplicationWhereInput {
  if (isPrivilegedSupervisorView) {
    switch (view) {
      case 'resubmitted':
        return { status: ApplicationStatus.submitted, auditLogs: { some: { action: 'resubmitted' } } };
      case 'returned':
        return { status: ApplicationStatus.needs_correction };
      case 'approved':
        return { status: { in: supervisorApprovedStatuses } };
      case 'rejected':
        return { status: ApplicationStatus.rejected };
      case 'all':
        return { status: { not: ApplicationStatus.draft } };
      case 'pending':
      default:
        return { status: ApplicationStatus.submitted };
    }
  }

  switch (view) {
    case 'resubmitted':
      return {
        AND: [
          { status: ApplicationStatus.submitted },
          { auditLogs: { some: { action: 'resubmitted' } } },
        ],
      };
    case 'returned':
      return {
        status: ApplicationStatus.needs_correction,
        auditLogs: { some: { action: 'returned_by_supervisor', actorId: supervisorId ?? '' } },
      };
    case 'approved':
      return {
        status: { not: ApplicationStatus.draft },
        auditLogs: { some: { action: 'approved_by_supervisor', actorId: supervisorId ?? '' } },
      };
    case 'rejected':
      return {
        status: ApplicationStatus.rejected,
        auditLogs: { some: { action: 'rejected_by_supervisor', actorId: supervisorId ?? '' } },
      };
    case 'all':
      return {
        OR: [
          supervisorPendingWhere(),
          supervisorViewWhere('returned', supervisorId),
          supervisorViewWhere('approved', supervisorId),
          supervisorViewWhere('rejected', supervisorId),
        ],
      };
    case 'pending':
    default:
      return supervisorPendingWhere();
  }
}

export default async function SupervisorPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/supervisor');
  if (!['supervisor', 'admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/applications');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      project: true,
      role: true,
      id: true,
      name: true,
      email: true,
      canCreateApplications: true,
      canManageFieldWorkers: true,
      supervisorDepartments: {
        orderBy: { project: 'asc' },
        select: { project: true },
      },
    },
  });

  const assignedProjects = user?.role === 'admin' || user?.role === 'super_admin'
    ? []
    : user?.supervisorDepartments.length
      ? user.supervisorDepartments.map((department) => department.project)
      : user?.project ? [user.project] : [];
  if (!['admin', 'super_admin'].includes(user?.role ?? '') && assignedProjects.length === 0) {
    return (
      <SupervisorShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications} canManageFieldWorkers={user?.canManageFieldWorkers}>
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Supervisor Review</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Your supervisor account needs a department assignment before applications can appear.</p>
        </header>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ask an admin to assign your supervisor account to a department.
        </div>
      </SupervisorShell>
    );
  }

  const search = searchParams.q?.trim() ?? '';
  const currentView = supervisorViews.some((view) => view.value === searchParams.status)
    ? searchParams.status as SupervisorView
    : 'pending';
  const isPrivilegedSupervisorView = ['admin', 'super_admin'].includes(user?.role ?? '');
  const baseWhereParts: Prisma.OrphanApplicationWhereInput[] = [
    ...(assignedProjects.length ? [collectorProjectsReviewWhere(assignedProjects)] : []),
    ...(!isPrivilegedSupervisorView ? [{ createdById: { not: user?.id ?? '' } }] : []),
  ];
  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    supervisorViewWhere(currentView, user?.id, isPrivilegedSupervisorView),
    ...baseWhereParts,
    ...(search ? [applicationSearchWhere(search)] : []),
  ];

  const supervisorHref = (view: SupervisorView) => {
    const params = new URLSearchParams();
    if (view !== 'pending') params.set('status', view);
    if (search) params.set('q', search);
    const query = params.toString();
    return query ? `/supervisor?${query}` : '/supervisor';
  };
  const clearSearchHref = currentView !== 'pending' ? `/supervisor?status=${currentView}` : '/supervisor';

  const applications = await withDatabaseRetry(() => prisma.orphanApplication.findMany({
      where: {
        AND: whereParts,
      },
      orderBy: { updatedAt: currentView === 'pending' || currentView === 'resubmitted' ? 'asc' : 'desc' },
      select: {
        ...sameFamilyApplicationSelect,
        id: true,
        registrationNumber: true,
        childName: true,
        collectorName: true,
        collectorProject: true,
        updatedAt: true,
        status: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            action: true,
            details: true,
            createdAt: true,
            actor: {
              select: {
                name: true,
                fieldWorkerId: true,
                role: true,
              },
            },
          },
        },
      },
    }));
  const sameFamilySummaries = await getSameFamilySummaries(applications);
  const viewCounts = [];
  for (const view of supervisorViews) {
    viewCounts.push({
      view: view.value,
      count: await withDatabaseRetry(() => prisma.orphanApplication.count({
        where: {
          AND: [
            supervisorViewWhere(view.value, user?.id, isPrivilegedSupervisorView),
            ...baseWhereParts,
          ],
        },
      })),
    });
  }
  const countsByView = new Map(viewCounts.map((item) => [item.view, item.count]));

  return (
    <SupervisorShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications} canManageFieldWorkers={user?.canManageFieldWorkers}>
      <header className="mb-5 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Supervisor Review</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          {assignedProjects.length ? `Applications submitted for ${assignedProjects.join(', ')}.` : 'All submitted applications.'}
        </p>
      </header>
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {supervisorViews.map((view) => (
          <Link
            key={view.value}
            href={supervisorHref(view.value)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${currentView === view.value ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <span>{view.label}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{countsByView.get(view.value) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <form action="/supervisor" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        {currentView !== 'pending' ? <input type="hidden" name="status" value={currentView} /> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search by name, registration, B-form, parent CNIC, department"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Search
          </button>
          {search ? (
            <Link href={clearSearchHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-blue-600 text-white">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No applications found.</td>
                </tr>
              ) : (
                applications.map((application) => {
                  const latestDetails = application.auditLogs[0]?.details as { comment?: unknown } | undefined;
                  const latestComment = typeof latestDetails?.comment === 'string' && latestDetails.comment.trim() ? latestDetails.comment.trim() : null;
                  const latestSupervisorReturn = application.auditLogs.find((log) => log.action === 'returned_by_supervisor');
                  const latestReturnActor = latestSupervisorReturn?.actor?.name
                    ?? latestSupervisorReturn?.actor?.fieldWorkerId
                    ?? latestSupervisorReturn?.actor?.role?.replace(/_/g, ' ');
                  return (
                    <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                        <div className="mt-1 text-xs text-slate-500">{application.childName ?? 'No child name'}</div>
                        <div className="mt-2">
                          <SameFamilyBadge summary={sameFamilySummaries.get(application.id)} />
                        </div>
                        {application.status === ApplicationStatus.submitted && latestReturnActor ? (
                          <p className="mt-2 text-xs leading-5 text-amber-700">Previously returned by {latestReturnActor}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">{application.collectorProject ?? '-'}</td>
                      <td className="px-4 py-4">{application.collectorName ?? '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(application.status)}`}>{applicationStatusLabel(application.status)}</span>
                        {latestComment ? <p className="mt-2 max-w-xs text-xs leading-5 text-amber-700">{latestComment}</p> : null}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(application.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <Link href={`/supervisor/applications/${application.id}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                          {application.status === 'submitted' ? 'Review' : 'View'}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {applications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No applications found.</p>
          ) : (
            applications.map((application) => {
              const latestDetails = application.auditLogs[0]?.details as { comment?: unknown } | undefined;
              const latestComment = typeof latestDetails?.comment === 'string' && latestDetails.comment.trim() ? latestDetails.comment.trim() : null;
              const latestSupervisorReturn = application.auditLogs.find((log) => log.action === 'returned_by_supervisor');
              const latestReturnActor = latestSupervisorReturn?.actor?.name
                ?? latestSupervisorReturn?.actor?.fieldWorkerId
                ?? latestSupervisorReturn?.actor?.role?.replace(/_/g, ' ');
              return (
                <Link key={application.id} href={`/supervisor/applications/${application.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                  <div className="mt-1 text-sm text-slate-600">{application.childName ?? 'No child name'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <SameFamilyBadge summary={sameFamilySummaries.get(application.id)} />
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${badgeClass(application.status)}`}>{applicationStatusLabel(application.status)}</span>
                    <span>{application.collectorProject ?? '-'}</span>
                    <span>{formatDate(application.updatedAt)}</span>
                  </div>
                  {application.status === ApplicationStatus.submitted && latestReturnActor ? (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Previously returned by {latestReturnActor}</p>
                  ) : null}
                  {latestComment ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{latestComment}</p> : null}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </SupervisorShell>
  );
}






