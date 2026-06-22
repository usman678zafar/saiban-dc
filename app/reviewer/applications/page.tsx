import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { ApplicationStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FilePlus2, Search, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ReviewerShell from '@/components/reviewer-shell';
import { applicationStatusLabel, badgeClass } from '@/lib/application-workflow';
import { applicationSearchWhere } from '@/lib/application-search';
import { formatDate } from '@/lib/date-format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const reviewerViews = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All Statuses' },
] as const;

type ReviewerView = (typeof reviewerViews)[number]['value'];

const reviewerApprovedStatuses = [
  ApplicationStatus.reviewer_approved,
  ApplicationStatus.admin_approved,
  ApplicationStatus.validated,
  ApplicationStatus.migrated,
];

const reviewerHistoryActions = [
  'approved_by_reviewer',
  'reviewer_approved_by_super_admin',
  'rejected_by_reviewer',
];

function reviewerApprovedWhere(reviewerId?: string, isPrivilegedReviewerView = false): Prisma.OrphanApplicationWhereInput {
  const where: Prisma.OrphanApplicationWhereInput = { status: { in: reviewerApprovedStatuses } };
  if (isPrivilegedReviewerView) return where;

  return {
    ...where,
    auditLogs: {
      some: {
        action: 'approved_by_reviewer',
        actorId: reviewerId ?? '',
      },
    },
  };
}

function reviewerViewWhere(
  view: ReviewerView,
  reviewerId?: string,
  isPrivilegedReviewerView = false,
): Prisma.OrphanApplicationWhereInput {
  switch (view) {
    case 'approved':
      return reviewerApprovedWhere(reviewerId, isPrivilegedReviewerView);
    case 'rejected':
      return {
        status: ApplicationStatus.rejected,
        auditLogs: { some: { action: { in: reviewerHistoryActions } } },
      };
    case 'all':
      return {
        OR: [
          { status: ApplicationStatus.supervisor_approved },
          reviewerApprovedWhere(reviewerId, isPrivilegedReviewerView),
          {
            status: ApplicationStatus.rejected,
            auditLogs: { some: { action: { in: reviewerHistoryActions } } },
          },
        ],
      };
    case 'pending':
    default:
      return { status: ApplicationStatus.supervisor_approved };
  }
}

function isReviewerView(value: string | undefined): value is ReviewerView {
  return reviewerViews.some((view) => view.value === value);
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

export default async function ReviewerApplicationsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/reviewer/applications');
  if (!['reviewer', 'admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/applications');

  const search = searchParams.q?.trim() ?? '';
  const currentView: ReviewerView = isReviewerView(searchParams.status) ? searchParams.status : 'pending';
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, role: true, canCreateApplications: true },
  });
  const isPrivilegedReviewerView = ['admin', 'super_admin'].includes(user?.role ?? '');
  const baseWhereParts: Prisma.OrphanApplicationWhereInput[] = [
    ...(!isPrivilegedReviewerView ? [{ createdById: { not: user?.id ?? '' } }] : []),
  ];
  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    reviewerViewWhere(currentView, user?.id, isPrivilegedReviewerView),
    ...baseWhereParts,
    ...(search ? [applicationSearchWhere(search)] : []),
  ];
  const where: Prisma.OrphanApplicationWhereInput = { AND: whereParts };
  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const reviewerHref = (view: ReviewerView) => {
    const params = new URLSearchParams();
    if (view !== 'pending') params.set('status', view);
    if (search) params.set('q', search);
    const query = params.toString();
    return query ? `/reviewer/applications?${query}` : '/reviewer/applications';
  };
  const clearSearchHref = currentView !== 'pending' ? `/reviewer/applications?status=${currentView}` : '/reviewer/applications';
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (currentView !== 'pending') params.set('status', currentView);
    if (search) params.set('q', search);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return query ? `/reviewer/applications?${query}` : '/reviewer/applications';
  };

  const [applications, total, viewCounts] = await Promise.all([
    withDatabaseRetry(() => prisma.orphanApplication.findMany({
      where,
      orderBy: { updatedAt: currentView === 'pending' ? 'asc' : 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        collectorName: true,
        collectorProject: true,
        updatedAt: true,
        status: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { action: true, details: true, createdAt: true },
        },
      },
    })),
    withDatabaseRetry(() => prisma.orphanApplication.count({ where })),
    Promise.all(reviewerViews.map(async (view) => ({
      view: view.value,
      count: await withDatabaseRetry(() => prisma.orphanApplication.count({
        where: { AND: [reviewerViewWhere(view.value, user?.id, isPrivilegedReviewerView), ...baseWhereParts] },
      })),
    }))),
  ]);
  const countsByView = new Map(viewCounts.map((item) => [item.view, item.count]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <ReviewerShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications}>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Reviewer Applications</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">Review supervisor-approved applications and revisit approved or rejected reviewer decisions.</p>
        </div>
        {user?.canCreateApplications ? (
          <Link href="/applications/new" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 sm:min-w-36">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Application
          </Link>
        ) : null}
      </header>

      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {reviewerViews.map((view) => (
          <Link
            key={view.value}
            href={reviewerHref(view.value)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${currentView === view.value ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <span>{view.label}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{countsByView.get(view.value) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <form action="/reviewer/applications" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        {currentView !== 'pending' ? <input type="hidden" name="status" value={currentView} /> : null}
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
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No applications found.</td>
                </tr>
              ) : (
                applications.map((application) => {
                  const latestDetails = application.auditLogs[0]?.details as { comment?: unknown } | undefined;
                  const latestComment = typeof latestDetails?.comment === 'string' && latestDetails.comment.trim() ? latestDetails.comment.trim() : null;
                  return (
                    <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                        <div className="mt-1 text-xs text-slate-500">{application.childName ?? 'No child name'}</div>
                      </td>
                      <td className="px-4 py-4">{application.collectorProject ?? '-'}</td>
                      <td className="px-4 py-4">{application.collectorName ?? '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(application.status)}`}>{applicationStatusLabel(application.status)}</span>
                        {latestComment ? <p className="mt-2 max-w-xs text-xs leading-5 text-amber-700">{latestComment}</p> : null}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(application.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <Link href={`/reviewer/applications/${application.id}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                          {application.status === ApplicationStatus.supervisor_approved ? 'Review' : 'View'}
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
              return (
                <Link key={application.id} href={`/reviewer/applications/${application.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="font-semibold text-slate-900">{application.registrationNumber ?? application.id}</div>
                  <div className="mt-1 text-sm text-slate-600">{application.childName ?? 'No child name'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${badgeClass(application.status)}`}>{applicationStatusLabel(application.status)}</span>
                    <span>{application.collectorProject ?? '-'}</span>
                    <span>{formatDate(application.updatedAt)}</span>
                  </div>
                  {latestComment ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{latestComment}</p> : null}
                </Link>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{total === 0 ? 'No records' : `Showing ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} of ${total}`}</span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">Previous</span>
            )}
            <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
              Page {page} of {totalPages}
            </span>
            {hasNext ? (
              <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">Next</span>
            )}
          </div>
        </div>
      </div>
    </ReviewerShell>
  );
}
