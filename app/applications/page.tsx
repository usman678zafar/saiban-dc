import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import { authOptions } from '@/lib/auth';
import DeleteDraftApplicationButton from '@/components/delete-draft-application-button';
import { CopyPlus, Eye, Pencil, Search, X } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { applicationSearchWhere } from '@/lib/application-search';
import VolunteerApplicationStatus from '@/components/volunteer-application-status';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

type ApplicationListRecord = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  updatedAt: Date;
  auditLogs?: Array<{ details: unknown; createdAt: Date }>;
};

type ApplicationListItem = {
  id: string;
  registrationNumber: string;
  childName: string;
  status: string;
  updatedAt: string;
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
  const user = session?.user?.email
    ? await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
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
        updatedAt: true,
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
    updatedAt: dateTimeFormatter.format(application.updatedAt),
    correctionComment: typeof (application.auditLogs?.[0]?.details as any)?.comment === 'string' ? (application.auditLogs?.[0]?.details as any).comment : null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
      <form action="/applications" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
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
            <Link href="/applications" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="grid min-w-0 gap-3 md:hidden">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-sm">
          {total === 0 ? 'No records' : `Showing ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} of ${total}`}
        </div>
        {applications.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No applications found.
          </div>
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
                    confirmationText={isSuperAdmin ? 'Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone.' : undefined}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                ) : null}
                {application.status === 'submitted' ? (
                  <Link
                    href={`/applications/${application.id}/duplicate`}
                    aria-label="Add child from same family"
                    title="Add child from same family"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  >
                    <CopyPlus className="h-5 w-5" />
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        )}
        <MobilePagination page={page} hasPrev={hasPrev} hasNext={hasNext} totalPages={totalPages} pageHref={pageHref} />
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No applications found.
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
                    {isAdmin ? <span>{applicationStatusLabel(application.status)}</span> : <VolunteerApplicationStatus status={application.status} />}
                    {application.correctionComment ? (
                      <p className="mt-1 max-w-xs text-xs leading-5 text-amber-700">{application.correctionComment}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-500">{application.updatedAt}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
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
                        confirmationText={isSuperAdmin ? 'Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone.' : undefined}
                      />
                    ) : null}
                    {application.status === 'submitted' ? (
                      <Link
                        href={`/applications/${application.id}/duplicate`}
                        aria-label="Add child from same family"
                        title="Add child from same family"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        <CopyPlus className="h-4 w-4" />
                      </Link>
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
    </AppShell>
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




