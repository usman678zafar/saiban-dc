import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import SupervisorShell from '@/components/supervisor-shell';
import ReviewerShell from '@/components/reviewer-shell';
import { authOptions } from '@/lib/auth';
import DeleteDraftApplicationButton from '@/components/delete-draft-application-button';
import DuplicateApplicationButton from '@/components/duplicate-application-button';
import { AlertTriangle, Eye, Pencil, Search, X } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { applicationSearchWhere } from '@/lib/application-search';
import VolunteerApplicationStatus from '@/components/volunteer-application-status';
import ApplicationDeadlineNotice from '@/components/application-deadline-notice';
import { isValidDate } from '@/lib/safe-date';
import { APPLICATION_COMPLETION_DEADLINE_DAYS } from '@/lib/application-deadline';
import { isNewApplicationIntakeEnabled } from '@/lib/application-intake';
import ApplicationIntakeClosed from '@/components/application-intake-closed';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const DUPLICABLE_STATUSES = new Set(['draft', 'submitted']);

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatApplicationDateTime(value: Date) {
  return isValidDate(value) ? dateTimeFormatter.format(value) : '';
}

type ApplicationListRecord = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  filledFieldsPercentage: number;
  auditLogs?: Array<{ details: unknown; createdAt: Date }>;
};

type ApplicationListItem = {
  id: string;
  registrationNumber: string;
  childName: string;
  status: string;
  createdAt: Date;
  updatedAt: string;
  filledFieldsPercentage: number;
  correctionComment: string | null;
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/applications');

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const isSupervisor = session.user.role === 'supervisor';
  const isReviewer = session.user.role === 'reviewer';
  const isFieldWorker = session.user.role === 'field_worker';
  const canCreateApplications = session.user.role === 'field_worker'
    || isAdmin
    || ((session.user.role === 'supervisor' || session.user.role === 'reviewer') && Boolean(session.user.canCreateApplications));
  if (!canCreateApplications) {
    redirect(session.user.role === 'supervisor' ? '/supervisor' : session.user.role === 'reviewer' ? '/reviewer/applications' : '/dashboard');
  }
  const canStartNewApplication = isNewApplicationIntakeEnabled();
  const user = session?.user?.email
    ? await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, canCreateApplications: true, canManageFieldWorkers: true },
    })
    : null;
  const search = searchParams.q?.trim() ?? '';
  const ownerWhere = isAdmin ? {} : { createdById: user?.id ?? '' };
  const searchWhere = applicationSearchWhere(search);
  const where = { ...ownerWhere, ...searchWhere };

  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return query ? `/applications?${query}` : '/applications';
  };

  const [records, total] = await Promise.all([
    prisma.orphanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        filledFieldsPercentage: true,
        auditLogs: {
          where: { action: { in: ['returned_by_supervisor', 'returned_by_admin'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { details: true, createdAt: true },
        },
      },
    }) as Promise<ApplicationListRecord[]>,
    prisma.orphanApplication.count({ where }),
  ]);

  const applications: ApplicationListItem[] = records.map((application) => ({
    id: application.id,
    registrationNumber: application.registrationNumber ?? application.id,
    childName: application.childName ?? 'No child name',
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: formatApplicationDateTime(application.updatedAt),
    filledFieldsPercentage: application.filledFieldsPercentage,
    correctionComment: typeof (application.auditLogs?.[0]?.details as any)?.comment === 'string' ? (application.auditLogs?.[0]?.details as any).comment : null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const content = (
    <>
      {!canStartNewApplication ? <ApplicationIntakeClosed compact /> : null}
      <DraftDeletionBanner />

      <form action="/applications" className="mb-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:h-4 sm:w-4" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search by name, registration, B-form, parent CNIC, department"
              className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-10 sm:pl-10"
            />
          </label>
          <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 sm:h-10">
            Search
          </button>
          {search ? (
            <Link href="/applications" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="grid min-w-0 gap-2 md:hidden">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          {total === 0 ? 'No records' : `Showing ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} of ${total}`}
        </div>
        {applications.length === 0 ? (
          <EmptyApplicationsState search={search} compact canCreateApplications={canStartNewApplication} />
        ) : (
          applications.map((application: ApplicationListItem) => (
            <article key={application.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">{application.registrationNumber}</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{application.childName}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {isAdmin ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{applicationStatusLabel(application.status)}</span>
                  ) : (
                    <VolunteerApplicationStatus status={application.status} />
                  )}
                  <span className="text-xs text-slate-500">Updated {application.updatedAt}</span>
                </div>
                {application.correctionComment ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{application.correctionComment}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5">
                  {isFieldWorker ? (
                    <ApplicationDeadlineNotice
                      createdAt={application.createdAt}
                      status={application.status}
                      completionPercentage={application.filledFieldsPercentage}
                      compact
                    />
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/applications/${application.id}`}
                  aria-label="View application"
                  title="View application"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200"
                >
                  <Eye className="h-5 w-5" />
                </Link>
                {isSuperAdmin || application.status === 'draft' || application.status === 'needs_correction' ? (
                  <Link
                    href={`/applications/${application.id}/edit`}
                    aria-label="Edit application"
                    title="Edit application"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="h-5 w-5" />
                  </Link>
                ) : (
                  <span
                    aria-label="Edit unavailable"
                    title="Edit unavailable"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-100 text-slate-300"
                  >
                    <Pencil className="h-5 w-5" />
                  </span>
                )}
                {isSuperAdmin || application.status === 'draft' ? (
                  <DeleteDraftApplicationButton
                    applicationId={application.id}
                    title="Delete application"
                    requiresPassword={isSuperAdmin && application.status !== 'draft'}
                    confirmationText={isSuperAdmin ? 'Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone.' : undefined}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                ) : null}
                {canStartNewApplication && DUPLICABLE_STATUSES.has(application.status) ? (
                  <DuplicateApplicationButton
                    applicationId={application.id}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    iconClassName="h-5 w-5"
                  />
                ) : null}
              </div>
            </article>
          ))
        )}
        <MobilePagination page={page} hasPrev={hasPrev} hasNext={hasNext} totalPages={totalPages} pageHref={pageHref} />
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-4 py-4 font-semibold">Application</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Updated</th>
              <th className="w-48 px-4 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8">
                  <EmptyApplicationsState search={search} canCreateApplications={canStartNewApplication} />
                </td>
              </tr>
            ) : (
              applications.map((application: ApplicationListItem) => (
                <tr key={application.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="max-w-[420px] px-4 py-4 align-top">
                    <div className="break-words font-semibold text-slate-900 [overflow-wrap:anywhere]">{application.registrationNumber}</div>
                    <div className="mt-1 break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{application.childName}</div>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-700">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isAdmin ? <span>{applicationStatusLabel(application.status)}</span> : <VolunteerApplicationStatus status={application.status} />}
                      {isFieldWorker ? (
                        <ApplicationDeadlineNotice
                          createdAt={application.createdAt}
                          status={application.status}
                          completionPercentage={application.filledFieldsPercentage}
                          compact
                        />
                      ) : null}
                    </div>
                    {application.correctionComment ? (
                      <p className="mt-1 max-w-xs text-xs leading-5 text-amber-700">{application.correctionComment}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-500">{application.updatedAt}</td>
                  <td className="w-48 px-4 py-4 align-top">
                    <div className="flex flex-nowrap gap-2">
                    <Link
                      href={`/applications/${application.id}`}
                      aria-label="View application"
                      title="View application"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {isSuperAdmin || application.status === 'draft' || application.status === 'needs_correction' ? (
                      <Link
                        href={`/applications/${application.id}/edit`}
                        aria-label="Edit application"
                        title="Edit application"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    ) : null}
                    {isSuperAdmin || application.status === 'draft' ? (
                      <DeleteDraftApplicationButton
                        applicationId={application.id}
                        title="Delete application"
                        requiresPassword={isSuperAdmin && application.status !== 'draft'}
                        confirmationText={isSuperAdmin ? 'Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone.' : undefined}
                      />
                    ) : null}
                    {canStartNewApplication && DUPLICABLE_STATUSES.has(application.status) ? (
                      <DuplicateApplicationButton
                        applicationId={application.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      />
                    ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total === 0 ? 'No records' : `Showing ${skip + 1}–${Math.min(skip + PAGE_SIZE, total)} of ${total}`}</span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">Previous</span>
            )}
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
    </>
  );

  if (isSupervisor) {
    return (
      <SupervisorShell
        email={session.user.email}
        name={user?.name}
        canCreateApplications={user?.canCreateApplications}
        canManageFieldWorkers={user?.canManageFieldWorkers}
      >
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Your Applications</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">Browse recent submissions, continue drafts, and open records for review.</p>
          </div>
          {canStartNewApplication ? (
            <Link
              href="/applications/new"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 sm:min-w-36"
            >
              + Application
            </Link>
          ) : null}
        </header>
        {content}
      </SupervisorShell>
    );
  }

  if (isReviewer) {
    return (
      <ReviewerShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications}>
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Your Applications</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">Browse applications created from your reviewer account.</p>
          </div>
          {canStartNewApplication ? (
            <Link
              href="/applications/new"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 sm:min-w-36"
            >
              + Application
            </Link>
          ) : null}
        </header>
        {content}
      </ReviewerShell>
    );
  }

  return (
    <AppShell
      title="Applications"
      description="Browse recent submissions, continue drafts, and open records for review."
      maxWidth="max-w-6xl"
      actions={
        isAdmin ? (
          <>
            <Link href="/api/applications/export?format=csv" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
              Export CSV
            </Link>
            <Link href="/api/applications/export?format=json" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300 sm:w-auto">
              Export JSON
            </Link>
          </>
        ) : null
      }
    >
      {content}
    </AppShell>
  );
}

function DraftDeletionBanner() {
  return (
    <section className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950 shadow-sm sm:px-4" aria-label="Draft application deletion warning">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="grid min-w-0 gap-2 md:grid-cols-2 md:items-start md:gap-4">
          <p className="text-sm font-semibold leading-6">
            Draft applications must be completed and submitted within {APPLICATION_COMPLETION_DEADLINE_DAYS} days, otherwise they will be removed.
          </p>
          <p className="text-right text-sm font-semibold leading-7" dir="rtl" lang="ur">
            ڈرافٹ درخواستیں {APPLICATION_COMPLETION_DEADLINE_DAYS} دن کے اندر مکمل کر کے جمع نہ کرائی گئیں تو حذف کر دی جائیں گی۔
          </p>
        </div>
      </div>
    </section>
  );
}

function EmptyApplicationsState({ search, compact = false, canCreateApplications = true }: { search: string; compact?: boolean; canCreateApplications?: boolean }) {
  const isSearchEmpty = Boolean(search);

  return (
    <div className={`mx-auto flex max-w-xl flex-col items-center text-center ${compact ? 'rounded-lg border border-slate-200 bg-white px-5 py-7 shadow-sm' : 'px-4 py-8'}`}>
      <img
        src="/empty-states/applications-empty.png"
        alt=""
        aria-hidden="true"
        className="h-32 w-32 object-contain sm:h-40 sm:w-40"
      />
      <h2 className="mt-3 text-lg font-semibold text-slate-950">
        {isSearchEmpty ? 'No matching applications' : 'No applications yet'}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        {isSearchEmpty
          ? 'Try a different name, registration number, B-form, CNIC, or department.'
          : canCreateApplications
            ? 'Start the first orphan support application. You can save it as a draft and come back anytime.'
            : 'New applications are temporarily paused. Existing drafts remain available.'}
      </p>
      <div className="mt-5 flex w-full flex-col items-center justify-center gap-2 sm:flex-row">
        {isSearchEmpty ? (
          <Link href="/applications" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">
            Clear Search
          </Link>
        ) : null}
        {canCreateApplications ? <Link href="/applications/new" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 sm:w-auto">
          + Application
        </Link> : null}
      </div>
    </div>
  );
}

function MobilePagination({ page, hasPrev, hasNext, totalPages, pageHref }: { page: number; hasPrev: boolean; hasNext: boolean; totalPages: number; pageHref: (page: number) => string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 text-center text-xs font-semibold text-slate-500">
        Page {page} of {totalPages}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hasPrev ? (
          <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-300">Previous</span>
        )}
        {hasNext ? (
          <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Next
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-300">Next</span>
        )}
      </div>
    </div>
  );
}




