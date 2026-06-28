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
import BulkDeleteApplicationsButton from '@/components/bulk-delete-applications-button';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import ApplicationDeadlineNotice from '@/components/application-deadline-notice';
import { SameFamilyBadge } from '@/components/same-family-indicator';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { applicationSearchWhere } from '@/lib/application-search';
import { formatDate } from '@/lib/date-format';
import { collectorProjectReviewWhere } from '@/lib/field-workers';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import {
  buildSameFamilyData,
  loadSameFamilyPool,
  sameFamilyApplicationSelect,
  type SameFamilyApplicationListItem,
  type SameFamilySummary,
} from '@/lib/same-family-applications';

const PAGE_SIZE = 50;
const BULK_DELETE_FORM_ID = 'admin-applications-bulk-delete-form';
const statusFilters = [
  { key: 'all', label: 'All Statuses', detail: 'Every application stage' },
  { key: 'drafts', label: 'Drafts', detail: 'Saved but not submitted' },
  { key: 'submitted', label: 'Submitted', detail: 'Waiting for supervisor review' },
  { key: 'needs_correction', label: 'Needs Correction', detail: 'Returned for volunteer correction' },
  { key: 'supervisor_approved', label: 'Supervisor Approved', detail: 'Ready for reviewer flow' },
  { key: 'pending_admin_review', label: 'Pending Admin Review', detail: 'Approved by reviewers and ready for admin decision' },
  { key: 'admin_on_hold', label: 'On Hold', detail: 'Held by admin for later or special review' },
  { key: 'admin_approved', label: 'Admin Approved', detail: 'Final admin approval completed' },
  { key: 'validated', label: 'Validated', detail: 'Validated records' },
  { key: 'migrated', label: 'Migrated', detail: 'Migrated records' },
  { key: 'rejected', label: 'Rejected', detail: 'Rejected records' },
] as const;

type StatusFilter = (typeof statusFilters)[number]['key'];

const completionFilters = [
  { key: 'all', label: 'Any completion %', min: undefined, max: undefined },
  { key: '0-10', label: '0-10% complete', min: 0, max: 10 },
  { key: '11-25', label: '11-25% complete', min: 11, max: 25 },
  { key: '26-50', label: '26-50% complete', min: 26, max: 50 },
  { key: '51-75', label: '51-75% complete', min: 51, max: 75 },
  { key: '76-100', label: '76-100% complete', min: 76, max: 100 },
] as const;

type CompletionFilter = (typeof completionFilters)[number]['key'];
type DateFilterType = 'updatedAt' | 'createdAt';

const familyFilters = [
  { key: 'all', label: 'Any family match' },
  { key: 'multiple_orphans', label: 'Multiple orphans' },
  { key: 'no_related', label: 'No related orphan' },
  { key: 'multiple_approved', label: 'Multiple final approvals' },
] as const;

type FamilyFilter = (typeof familyFilters)[number]['key'];
const finalApprovalStatuses = new Set<ApplicationStatus>([
  ApplicationStatus.admin_approved,
  ApplicationStatus.validated,
  ApplicationStatus.migrated,
]);

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return statusFilters.some((filter) => filter.key === value);
}

function isCompletionFilter(value: string | undefined): value is CompletionFilter {
  return completionFilters.some((filter) => filter.key === value);
}

function isDateFilterType(value: string | undefined): value is DateFilterType {
  return value === 'createdAt' || value === 'updatedAt';
}

function isFamilyFilter(value: string | undefined): value is FamilyFilter {
  return familyFilters.some((filter) => filter.key === value);
}

function matchesFamilyFilter(status: ApplicationStatus, summary: SameFamilySummary, filter: FamilyFilter) {
  if (filter === 'multiple_orphans') return summary.count > 0;
  if (filter === 'no_related') return summary.count === 0;
  if (filter === 'multiple_approved') {
    const relatedFinalApprovals = (summary.statuses.admin_approved ?? 0)
      + (summary.statuses.validated ?? 0)
      + (summary.statuses.migrated ?? 0);
    return relatedFinalApprovals + (finalApprovalStatuses.has(status) ? 1 : 0) > 1;
  }
  return true;
}

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDateInput(value: string | undefined) {
  const date = parseDateInput(value);
  if (!date) return null;
  date.setUTCHours(23, 59, 59, 999);
  return date;
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
    case 'admin_on_hold':
      return { status: ApplicationStatus.admin_on_hold };
    case 'validated':
      return { status: ApplicationStatus.validated };
    case 'rejected':
      return { status: ApplicationStatus.rejected };
    case 'migrated':
      return { status: ApplicationStatus.migrated };
    default:
      return {};
  }
}

type ApplicationListRecord = Prisma.OrphanApplicationGetPayload<{
  select: {
    id: true;
    registrationNumber: true;
    childName: true;
    age: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    filledFieldsPercentage: true;
    collectorId: true;
    collectorName: true;
    collectorProject: true;
    fatherName: true;
    fatherCnic: true;
    motherName: true;
    motherCnic: true;
    motherIsGuardian: true;
    motherContact: true;
    guardianName: true;
    guardianCnic: true;
    guardianContact: true;
    fullAddress: true;
    createdBy: {
      select: {
        name: true;
        fieldWorkerId: true;
        project: true;
        selfRegistered: true;
      };
    };
  };
}>;

type ApplicationListItem = ApplicationListRecord;

const applicationListSelect = {
  ...sameFamilyApplicationSelect,
  createdAt: true,
  filledFieldsPercentage: true,
  collectorId: true,
  collectorName: true,
  collectorProject: true,
  createdBy: {
    select: {
      name: true,
      fieldWorkerId: true,
      project: true,
      selfRegistered: true,
    },
  },
} satisfies Prisma.OrphanApplicationSelect;

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
  searchParams: { page?: string; q?: string; status?: string; department?: string; completion?: string; filled?: string; family?: string; dateFrom?: string; dateTo?: string; dateType?: string };
}) {
  const [session, projects] = await Promise.all([
    getServerSession(authOptions),
    getFieldWorkerProjectOptions(),
  ]);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');
  const isSuperAdmin = session.user.role === 'super_admin';

  const search = searchParams.q?.trim() ?? '';
  const selectedDepartment = projects.includes(searchParams.department ?? '') ? searchParams.department ?? 'all' : 'all';
  const searchWhere = applicationSearchWhere(search);
  const defaultStatusFilter: StatusFilter = isSuperAdmin ? 'all' : 'pending_admin_review';
  const selectedStatusFilter: StatusFilter = isStatusFilter(searchParams.status)
    ? searchParams.status
    : defaultStatusFilter;
  const canBulkSelectDrafts = isSuperAdmin && selectedStatusFilter === 'drafts';
  const completionParam = searchParams.completion ?? searchParams.filled;
  const selectedCompletionFilter: CompletionFilter = isCompletionFilter(completionParam) ? completionParam : 'all';
  const selectedCompletionDefinition = completionFilters.find((filter) => filter.key === selectedCompletionFilter) ?? completionFilters[0];
  const selectedFamilyFilter: FamilyFilter = isFamilyFilter(searchParams.family) ? searchParams.family : 'all';
  const selectedDateType: DateFilterType = isDateFilterType(searchParams.dateType) ? searchParams.dateType : 'updatedAt';
  const dateFrom = parseDateInput(searchParams.dateFrom);
  const dateTo = endOfDateInput(searchParams.dateTo);
  const dateRangeWhere: Prisma.OrphanApplicationWhereInput = dateFrom || dateTo
    ? {
      [selectedDateType]: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    }
    : {};
  const completionWhere: Prisma.OrphanApplicationWhereInput = selectedCompletionFilter === 'all'
    ? {}
    : {
      filledFieldsPercentage: {
        ...(selectedCompletionDefinition.min !== undefined ? { gte: selectedCompletionDefinition.min } : {}),
        ...(selectedCompletionDefinition.max !== undefined ? { lte: selectedCompletionDefinition.max } : {}),
      },
    };
  const statusWhere = applicationFilterWhere(selectedStatusFilter);
  const departmentWhere = selectedDepartment !== 'all' ? collectorProjectReviewWhere(selectedDepartment) : {};
  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    searchWhere,
    statusWhere,
    departmentWhere,
    completionWhere,
    dateRangeWhere,
  ].filter((part) => Object.keys(part).length > 0);
  const where: Prisma.OrphanApplicationWhereInput = whereParts.length ? { AND: whereParts } : {};
  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedStatusFilter !== defaultStatusFilter) params.set('status', selectedStatusFilter);
    if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
    if (selectedCompletionFilter !== 'all') params.set('completion', selectedCompletionFilter);
    if (selectedFamilyFilter !== 'all') params.set('family', selectedFamilyFilter);
    if (searchParams.dateFrom) params.set('dateFrom', searchParams.dateFrom);
    if (searchParams.dateTo) params.set('dateTo', searchParams.dateTo);
    if (selectedDateType !== 'updatedAt') params.set('dateType', selectedDateType);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return query ? `/admin/applications?${query}` : '/admin/applications';
  };
  const hasActiveBulkDeleteFilter = Boolean(
    search
    || selectedDepartment !== 'all'
    || selectedStatusFilter !== 'all'
    || selectedCompletionFilter !== 'all'
    || searchParams.dateFrom
    || searchParams.dateTo
    || selectedFamilyFilter !== 'all',
  );

  let applications: ApplicationListItem[];
  let total: number;
  let matchingNonDraftCount: number;
  let sameFamilySummaries: Map<string, SameFamilySummary>;
  let relatedFamilyApplications: Map<string, SameFamilyApplicationListItem[]>;

  if (selectedFamilyFilter === 'all') {
    const [applicationRecords, unfilteredTotal, unfilteredNonDraftCount, familyPool] = await Promise.all([
      prisma.orphanApplication.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: PAGE_SIZE,
        select: applicationListSelect,
      }) as Promise<ApplicationListRecord[]>,
      prisma.orphanApplication.count({ where }),
      isSuperAdmin
        ? prisma.orphanApplication.count({ where: { AND: [where, { status: { not: ApplicationStatus.draft } }] } })
        : Promise.resolve(0),
      loadSameFamilyPool(),
    ]);
    applications = applicationRecords;
    total = unfilteredTotal;
    matchingNonDraftCount = unfilteredNonDraftCount;
    const familyData = buildSameFamilyData(applications, familyPool);
    sameFamilySummaries = familyData.summaries;
    relatedFamilyApplications = familyData.relatedApplications;
  } else {
    const [candidates, familyPool] = await Promise.all([
      prisma.orphanApplication.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: applicationListSelect,
      }) as Promise<ApplicationListRecord[]>,
      loadSameFamilyPool(),
    ]);
    const candidateFamilyData = buildSameFamilyData(candidates, familyPool);
    const candidateSummaries = candidateFamilyData.summaries;
    const matchingCandidates = candidates.filter((application) => matchesFamilyFilter(
      application.status,
      candidateSummaries.get(application.id) ?? { count: 0, statuses: {} },
      selectedFamilyFilter,
    ));
    applications = matchingCandidates.slice(skip, skip + PAGE_SIZE);
    const pageIds = applications.map((application) => application.id);
    total = matchingCandidates.length;
    matchingNonDraftCount = isSuperAdmin
      ? matchingCandidates.filter((application) => application.status !== ApplicationStatus.draft).length
      : 0;
    sameFamilySummaries = new Map(pageIds.map((id) => [
      id,
      candidateSummaries.get(id) ?? { count: 0, statuses: {} },
    ]));
    relatedFamilyApplications = new Map(pageIds.map((id) => [
      id,
      candidateFamilyData.relatedApplications.get(id) ?? [],
    ]));
  }
  const sameFamilyModalEntries: Array<readonly [string, SameFamilyApplicationListItem[]]> = applications.map((application) => {
    const summary = sameFamilySummaries.get(application.id);
    if (!summary?.count) return [application.id, [] as SameFamilyApplicationListItem[]] as const;

    const sameFamilyApplications = relatedFamilyApplications.get(application.id) ?? [];
    return [application.id, [application, ...sameFamilyApplications] satisfies SameFamilyApplicationListItem[]] as const;
  });
  const sameFamilyModalApplications = new Map<string, SameFamilyApplicationListItem[]>(sameFamilyModalEntries);
  const visibleDraftCount = canBulkSelectDrafts ? applications.length : 0;

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
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_minmax(150px,210px)_minmax(150px,210px)_minmax(145px,190px)_minmax(160px,210px)]">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9bb3]" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search by name, registration, B-form, parent CNIC, department"
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] pl-10 pr-3 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="min-w-0">
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
          <label className="min-w-0">
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
          <label className="min-w-0">
            <span className="sr-only">Filter by completion percentage</span>
            <select
              name="completion"
              defaultValue={selectedCompletionFilter}
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-sm font-semibold text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            >
              {completionFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>{filter.label}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by family match</span>
            <select
              name="family"
              defaultValue={selectedFamilyFilter}
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-sm font-semibold text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            >
              {familyFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>{filter.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(150px,190px)_minmax(180px,220px)_minmax(180px,220px)_auto_auto]">
          <label className="min-w-0">
            <span className="sr-only">Date type</span>
            <select
              name="dateType"
              defaultValue={selectedDateType}
              className="min-h-11 w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-sm font-semibold text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
            >
              <option value="updatedAt">Updated date</option>
              <option value="createdAt">Created date</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Start date</span>
            <div className="flex min-h-11 items-center rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] focus-within:border-[#3b82f6] focus-within:ring-2 focus-within:ring-blue-100">
              <span className="shrink-0 border-r border-[#dbe4ef] px-3 text-xs font-semibold text-[#6b7f99]">From</span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={searchParams.dateFrom ?? ''}
                className="min-h-11 w-full rounded-r-lg bg-transparent px-3 text-sm font-semibold text-[#0f1f33] outline-none"
              />
            </div>
          </label>
          <label className="min-w-0">
            <span className="sr-only">End date</span>
            <div className="flex min-h-11 items-center rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] focus-within:border-[#3b82f6] focus-within:ring-2 focus-within:ring-blue-100">
              <span className="shrink-0 border-r border-[#dbe4ef] px-3 text-xs font-semibold text-[#6b7f99]">To</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={searchParams.dateTo ?? ''}
                className="min-h-11 w-full rounded-r-lg bg-transparent px-3 text-sm font-semibold text-[#0f1f33] outline-none"
              />
            </div>
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563eb]">
            Search
          </button>
          {search || selectedDepartment !== 'all' || selectedStatusFilter !== defaultStatusFilter || selectedCompletionFilter !== 'all' || selectedFamilyFilter !== 'all' || searchParams.dateFrom || searchParams.dateTo || selectedDateType !== 'updatedAt' ? (
            <Link href="/admin/applications" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] px-4 py-2 text-sm font-semibold text-[#506784] hover:bg-[#f6f9fd]">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <form id={BULK_DELETE_FORM_ID}>
        {canBulkSelectDrafts ? (
          <BulkDeleteApplicationsButton
            formId={BULK_DELETE_FORM_ID}
            visibleDraftCount={visibleDraftCount}
            matchingCount={total}
            matchingNonDraftCount={matchingNonDraftCount}
            hasActiveFilter={hasActiveBulkDeleteFilter && selectedFamilyFilter === 'all'}
            filters={{
              q: search,
              status: selectedStatusFilter,
              department: selectedDepartment,
              completion: selectedCompletionFilter,
              dateType: selectedDateType,
              dateFrom: searchParams.dateFrom ?? '',
              dateTo: searchParams.dateTo ?? '',
            }}
          />
        ) : null}
      <div className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="grid gap-3 p-3 md:hidden">
          {applications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a9bb3]">No applications found.</p>
          ) : (
            applications.map((application: ApplicationListItem) => (
              <div key={application.id} className="rounded-xl border border-[#edf2f7] bg-white p-4">
                {canBulkSelectDrafts ? (
                  <label className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 text-xs font-semibold text-[#0f1f33]">
                    <input
                      type="checkbox"
                      name="applicationId"
                      data-draft-select="true"
                      value={application.id}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                    />
                    Select
                  </label>
                ) : null}
                <Link href={`/admin/applications/${application.id}`} className="block hover:bg-[#f8fbff]">
                  <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                  <div className="mt-1 text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-[#edf4ff] px-2 py-1 font-semibold text-[#2563eb]">{applicationStatusLabel(application.status)}</span>
                    <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold text-[#506784]">{departmentLabel(application) === '-' ? 'No department' : departmentLabel(application)}</span>
                    <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold text-[#506784]">{fieldWorkerLabel(application)}</span>
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{application.filledFieldsPercentage}% complete</span>
                  </div>
                  <p className="mt-3 text-xs text-[#8a9bb3]">Updated {formatDate(application.updatedAt)}</p>
                </Link>
                <div className="mt-3">
                  <SameFamilyBadge
                    summary={sameFamilySummaries.get(application.id)}
                    currentStatus={application.status}
                    modalApplications={sameFamilyModalApplications.get(application.id)}
                    currentApplicationId={application.id}
                    actorRole={isSuperAdmin ? 'super_admin' : 'admin'}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <ApplicationReviewDownloadButton
                    applicationId={application.id}
                    fileName={application.registrationNumber ?? application.id}
                    label="Download"
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
                  />
                  {(isSuperAdmin || application.status === ApplicationStatus.reviewer_approved || application.status === ApplicationStatus.admin_on_hold) ? (
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
            <thead className="bg-blue-600 text-xs uppercase tracking-[0.12em] text-white">
              <tr>
                {canBulkSelectDrafts ? <th className="w-16 px-4 py-4">Select</th> : null}
                <th className="px-4 py-4">Application</th>
                <th className="px-4 py-4">Field Worker</th>
                <th className="px-4 py-4">Department</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Completion</th>
                <th className="px-4 py-4">Updated</th>
                <th className="px-4 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
              <tr>
                  <td colSpan={canBulkSelectDrafts ? 8 : 7} className="px-4 py-8 text-center text-[#8a9bb3]">No applications found.</td>
                </tr>
              ) : (
                applications.map((application: ApplicationListItem) => (
                  <tr key={application.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    {canBulkSelectDrafts ? (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          name="applicationId"
                          data-draft-select="true"
                          value={application.id}
                          aria-label={`Select ${application.registrationNumber ?? application.id} for delete`}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#0f1f33]">{application.registrationNumber ?? application.id}</div>
                      <div className="text-xs text-[#8a9bb3]">{application.childName ?? 'No child name'}</div>
                      <div className="mt-2">
                        <SameFamilyBadge
                          summary={sameFamilySummaries.get(application.id)}
                          currentStatus={application.status}
                          modalApplications={sameFamilyModalApplications.get(application.id)}
                          currentApplicationId={application.id}
                          actorRole={isSuperAdmin ? 'super_admin' : 'admin'}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">{fieldWorkerLabel(application)}</td>
                    <td className="px-4 py-4">{departmentLabel(application)}</td>
                    <td className="px-4 py-4">{applicationStatusLabel(application.status)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex min-w-14 justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {application.filledFieldsPercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(application.updatedAt)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Link href={`/admin/applications/${application.id}`} className="rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff]">
                          Review
                        </Link>
                        <ApplicationReviewDownloadButton
                          applicationId={application.id}
                          fileName={application.registrationNumber ?? application.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
                        />
                        {(isSuperAdmin || application.status === ApplicationStatus.reviewer_approved || application.status === ApplicationStatus.admin_on_hold) ? (
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
                              requiresPassword={application.status !== ApplicationStatus.draft}
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
      </form>
    </AdminShell>
  );
}




