import Link from 'next/link';
import { ApplicationStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { Pencil, Search, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import DeleteDraftApplicationButton from '@/components/delete-draft-application-button';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { applicationSearchWhere } from '@/lib/application-search';
import { formatDate } from '@/lib/date-format';
import { collectorProjectReviewWhere } from '@/lib/field-workers';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import { applicationToWizardData } from '@/lib/application-wizard-data';
import { calculateApplicationCompletion } from '@/lib/application-review';

const PAGE_SIZE = 50;
const statusFilters = [
  { key: 'pending_admin_review', label: 'Pending Admin Review', detail: 'Approved by reviewers and ready for admin decision' },
  { key: 'all', label: 'All', detail: 'Every application stage' },
  { key: 'drafts', label: 'Drafts', detail: 'Saved but not submitted' },
  { key: 'submitted', label: 'Submitted', detail: 'Waiting for supervisor review' },
  { key: 'needs_correction', label: 'Needs Correction', detail: 'Returned for volunteer correction' },
  { key: 'supervisor_approved', label: 'Supervisor Approved', detail: 'Ready for reviewer flow' },
  { key: 'admin_approved', label: 'Admin Approved', detail: 'Final admin approval completed' },
  { key: 'validated', label: 'Validated', detail: 'Validated records' },
  { key: 'rejected', label: 'Rejected', detail: 'Rejected records' },
  { key: 'migrated', label: 'Migrated', detail: 'Migrated records' },
  { key: 'final_approved', label: 'Final Approved', detail: 'Admin approved, validated, migrated' },
] as const;

type StatusFilter = (typeof statusFilters)[number]['key'];

const finalApprovedWhere: Prisma.OrphanApplicationWhereInput = {
  status: { in: [ApplicationStatus.admin_approved, ApplicationStatus.validated, ApplicationStatus.migrated] },
};

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return statusFilters.some((filter) => filter.key === value);
}

function applicationFilterWhere(filter: StatusFilter): Prisma.OrphanApplicationWhereInput {
  switch (filter) {
    case 'pending_admin_review':
      return { status: ApplicationStatus.reviewer_approved };
    case 'drafts':
      return { status: ApplicationStatus.draft };
    case 'submitted':
      return { status: ApplicationStatus.submitted };
    case 'needs_correction':
      return { status: ApplicationStatus.needs_correction };
    case 'supervisor_approved':
      return { status: ApplicationStatus.supervisor_approved };
    case 'admin_approved':
      return { status: ApplicationStatus.admin_approved };
    case 'validated':
      return { status: ApplicationStatus.validated };
    case 'rejected':
      return { status: ApplicationStatus.rejected };
    case 'migrated':
      return { status: ApplicationStatus.migrated };
    case 'final_approved':
      return finalApprovedWhere;
    default:
      return {};
  }
}

type ApplicationListRecord = Prisma.OrphanApplicationGetPayload<{
  include: {
    siblings: true;
    relatives: true;
    householdAssets: true;
    createdBy: {
      select: {
        name: true;
        fieldWorkerId: true;
        project: true;
        selfRegistered: true;
      };
    };
    documents: {
      select: {
        documentType: true;
      };
    };
  };
}>;

type ApplicationListItem = ApplicationListRecord & {
  completionPercentage: number;
};

function fieldWorkerLabel(application: ApplicationListItem) {
  return application.createdBy.name
    ?? application.createdBy.fieldWorkerId
    ?? application.collectorName
    ?? application.collectorId
    ?? (application.createdBy.selfRegistered ? 'Self Registered' : null)
    ?? '-';
}

function departmentLabel(application: ApplicationListItem) {
  return application.collectorProject
    ?? application.createdBy.project
    ?? '-';
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string; department?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');
  const isSuperAdmin = session.user.role === 'super_admin';

  const search = searchParams.q?.trim() ?? '';
  const projects = await getFieldWorkerProjectOptions();
  const selectedDepartment = projects.includes(searchParams.department ?? '') ? searchParams.department ?? 'all' : 'all';
  const searchWhere = applicationSearchWhere(search);
  const defaultStatusFilter: StatusFilter = isSuperAdmin ? 'all' : 'pending_admin_review';
  const selectedStatusFilter: StatusFilter = isStatusFilter(searchParams.status)
    ? searchParams.status
    : defaultStatusFilter;
  const statusWhere = applicationFilterWhere(selectedStatusFilter);
  const departmentWhere = selectedDepartment !== 'all' ? collectorProjectReviewWhere(selectedDepartment) : {};
  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    searchWhere,
    statusWhere,
    departmentWhere,
  ].filter((part) => Object.keys(part).length > 0);
  const where: Prisma.OrphanApplicationWhereInput = whereParts.length ? { AND: whereParts } : {};
  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedStatusFilter !== defaultStatusFilter) params.set('status', selectedStatusFilter);
    if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return query ? `/admin/applications?${query}` : '/admin/applications';
  };

  const [applicationRecords, total] = await Promise.all([
    prisma.orphanApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        siblings: true,
        relatives: true,
        householdAssets: true,
        createdBy: {
          select: {
            name: true,
            fieldWorkerId: true,
            project: true,
            selfRegistered: true,
          },
        },
        documents: {
          select: {
            documentType: true,
          },
        },
      },
    }) as Promise<ApplicationListRecord[]>,
    prisma.orphanApplication.count({ where }),
  ]);
  const applications: ApplicationListItem[] = applicationRecords.map((application) => ({
    ...application,
    completionPercentage: calculateApplicationCompletion(applicationToWizardData(application), application.documents).percentage,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0f1f33]">Application Review</h1>
          <p className="mt-2 text-sm text-[#5f718a]">
            {isSuperAdmin
              ? 'Monitor every application stage, switch between queue segments, and open records that need action.'
              : 'Review applications approved by reviewers and complete final admin decisions.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link href="/api/applications/export?format=csv" className="rounded-xl bg-[#1f2b3d] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2f3d52]">
            Export CSV
          </Link>
          <Link href="/api/applications/export?format=json" className="rounded-xl border border-[#dbe4ef] bg-white px-4 py-3 text-center text-sm font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
            Export JSON
          </Link>
          <Link href="/admin/applications/new" className="rounded-xl bg-[#3b82f6] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#2563eb]">
            New Application
          </Link>
        </div>
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
          <label className="min-w-0 sm:w-56">
            <span className="sr-only">Filter by department</span>
            <select
              name="department"
              defaultValue={selectedDepartment}
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-sm font-semibold text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All departments</option>
              {projects.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 sm:w-60">
            <span className="sr-only">Filter by application status</span>
            <select
              name="status"
              defaultValue={selectedStatusFilter}
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-sm font-semibold text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            >
              {statusFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>{filter.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563eb]">
            Search
          </button>
          {search || selectedDepartment !== 'all' || selectedStatusFilter !== defaultStatusFilter ? (
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
              <div key={application.id} className="rounded-xl border border-[#edf2f7] bg-white p-4">
                <Link href={`/admin/applications/${application.id}`} className="block hover:bg-[#f8fbff]">
                  <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                  <div className="mt-1 text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-[#edf4ff] px-2 py-1 font-semibold text-[#2563eb]">{applicationStatusLabel(application.status)}</span>
                    <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold text-[#506784]">{departmentLabel(application) === '-' ? 'No department' : departmentLabel(application)}</span>
                    <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold text-[#506784]">{fieldWorkerLabel(application)}</span>
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{application.completionPercentage}% complete</span>
                  </div>
                  <p className="mt-3 text-xs text-[#8a9bb3]">Updated {formatDate(application.updatedAt)}</p>
                </Link>
                <div className="mt-3 flex gap-2">
                  <ApplicationReviewDownloadButton
                    applicationId={application.id}
                    fileName={application.registrationNumber ?? application.id}
                    label="Download"
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
                  />
                  {(isSuperAdmin || application.status === ApplicationStatus.reviewer_approved) ? (
                    <Link
                      href={`/applications/${application.id}/edit`}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm text-[#506784]">
            <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Field Worker</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Complete</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8a9bb3]">No applications found.</td>
                </tr>
              ) : (
                applications.map((application: ApplicationListItem) => (
                  <tr key={application.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                      <div className="text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                    </td>
                    <td className="px-4 py-4">{fieldWorkerLabel(application)}</td>
                    <td className="px-4 py-4">{departmentLabel(application)}</td>
                    <td className="px-4 py-4">{applicationStatusLabel(application.status)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex min-w-14 justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {application.completionPercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(application.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/applications/${application.id}`} className="rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff]">
                          Review
                        </Link>
                        <ApplicationReviewDownloadButton
                          applicationId={application.id}
                          fileName={application.registrationNumber ?? application.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
                        />
                        {(isSuperAdmin || application.status === ApplicationStatus.reviewer_approved) ? (
                          <>
                            <Link
                              href={`/applications/${application.id}/edit`}
                              aria-label="Edit application"
                              title="Edit application"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            {isSuperAdmin ? (
                            <DeleteDraftApplicationButton
                              applicationId={application.id}
                              title="Delete application"
                              confirmationText="Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone."
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#edf2f7] px-4 py-3 text-sm text-[#5f718a]">
          <span>{total === 0 ? 'No records' : `Showing ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} of ${total}`}</span>
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




