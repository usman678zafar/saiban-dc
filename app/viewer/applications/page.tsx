import Link from 'next/link';
import { ApplicationStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ViewerShell from '@/components/viewer-shell';
import { ViewerLocalizedText } from '@/components/viewer-language';
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
  { key: 'all', label: 'All Statuses' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'needs_correction', label: 'Needs Correction' },
  { key: 'supervisor_approved', label: 'Supervisor Approved' },
  { key: 'reviewer_approved', label: 'Reviewer Approved' },
  { key: 'admin_on_hold', label: 'On Hold' },
  { key: 'admin_approved', label: 'Admin Approved' },
  { key: 'validated', label: 'Validated' },
  { key: 'migrated', label: 'Migrated' },
  { key: 'rejected', label: 'Rejected' },
] as const;

type StatusFilter = (typeof statusFilters)[number]['key'];
type ViewMode = 'list' | 'grid';

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return statusFilters.some((filter) => filter.key === value);
}

function isViewMode(value: string | undefined): value is ViewMode {
  return value === 'list' || value === 'grid';
}

function applicationFilterWhere(filter: StatusFilter): Prisma.OrphanApplicationWhereInput {
  switch (filter) {
    case 'drafts':
      return { status: ApplicationStatus.draft };
    case 'submitted':
      return { status: ApplicationStatus.submitted };
    case 'needs_correction':
      return { status: ApplicationStatus.needs_correction };
    case 'supervisor_approved':
      return { status: ApplicationStatus.supervisor_approved };
    case 'reviewer_approved':
      return { status: ApplicationStatus.reviewer_approved };
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

function applicationLocation(application: ApplicationListItem) {
  return [application.city, application.tehsil, application.district, application.province].filter(Boolean).join(', ') || '-';
}

export default async function ViewerApplicationsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string; department?: string; view?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/viewer/applications');
  if (session.user.role !== 'viewer') redirect('/dashboard');

  const search = searchParams.q?.trim() ?? '';
  const projects = await getFieldWorkerProjectOptions();
  const selectedDepartment = projects.includes(searchParams.department ?? '') ? searchParams.department ?? 'all' : 'all';
  const selectedStatusFilter: StatusFilter = isStatusFilter(searchParams.status) ? searchParams.status : 'submitted';
  const selectedViewMode: ViewMode = isViewMode(searchParams.view) ? searchParams.view : 'grid';
  const whereParts: Prisma.OrphanApplicationWhereInput[] = [
    applicationSearchWhere(search),
    applicationFilterWhere(selectedStatusFilter),
    selectedDepartment !== 'all' ? collectorProjectReviewWhere(selectedDepartment) : {},
  ].filter((part) => Object.keys(part).length > 0);
  const where: Prisma.OrphanApplicationWhereInput = whereParts.length ? { AND: whereParts } : {};
  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const applicationsHref = (overrides: { page?: number; view?: ViewMode; status?: StatusFilter; department?: string; q?: string } = {}) => {
    const params = new URLSearchParams();
    const nextSearch = overrides.q ?? search;
    const nextStatus = overrides.status ?? selectedStatusFilter;
    const nextDepartment = overrides.department ?? selectedDepartment;
    const nextView = overrides.view ?? selectedViewMode;
    const nextPage = overrides.page ?? 1;

    if (nextSearch) params.set('q', nextSearch);
    if (nextStatus !== 'submitted') params.set('status', nextStatus);
    if (nextDepartment !== 'all') params.set('department', nextDepartment);
    if (nextView !== 'grid') params.set('view', nextView);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return query ? `/viewer/applications?${query}` : '/viewer/applications';
  };
  const pageHref = (nextPage: number) => applicationsHref({ page: nextPage });

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
    <ViewerShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full">
          <ViewerLocalizedText as="h1" en="Applications" ur="درخواستیں" className="text-3xl font-semibold tracking-tight text-[#0f1f33]" />
          <ViewerLocalizedText as="p" en="View all application records and download review PDFs." ur="تمام درخواستوں کا ریکارڈ دیکھیں اور ریویو PDF ڈاؤن لوڈ کریں۔" className="mt-2 text-sm text-[#5f718a]" />
        </div>
      </header>

      <form action="/viewer/applications" className="mb-4 rounded-xl border border-[#dbe4ef] bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="view" value={selectedViewMode} />
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
            <ViewerLocalizedText en="Search" ur="تلاش" />
          </button>
          {search || selectedDepartment !== 'all' || selectedStatusFilter !== 'submitted' ? (
            <Link href={applicationsHref({ q: '', status: 'submitted', department: 'all' })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] px-4 py-2 text-sm font-semibold text-[#506784] hover:bg-[#f6f9fd]">
              <X className="h-4 w-4" aria-hidden="true" />
              <ViewerLocalizedText en="Clear" ur="صاف کریں" />
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#edf2f7] bg-[#f8fbff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-[#0f1f33]">
            <ViewerLocalizedText en="Application results" ur="درخواستوں کے نتائج" />
          </span>
          <div className="inline-flex rounded-lg border border-[#dbe4ef] bg-white p-1">
            <Link
              href={applicationsHref({ view: 'list' })}
              className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${selectedViewMode === 'list' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#506784] hover:bg-[#f6f9fd]'}`}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              <ViewerLocalizedText en="List" ur="فہرست" />
            </Link>
            <Link
              href={applicationsHref({ view: 'grid' })}
              className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${selectedViewMode === 'grid' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#506784] hover:bg-[#f6f9fd]'}`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <ViewerLocalizedText en="Grid" ur="گرڈ" />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {applications.length === 0 ? (
            <ViewerLocalizedText as="p" en="No applications found." ur="کوئی درخواست نہیں ملی۔" className="px-4 py-10 text-center text-sm text-[#8a9bb3]" />
          ) : (
            applications.map((application) => (
              <ApplicationGridCard key={application.id} application={application} />
            ))
          )}
        </div>

        {selectedViewMode === 'grid' ? (
          <div className="hidden grid-cols-2 gap-4 p-4 md:grid xl:grid-cols-3 2xl:grid-cols-4">
            {applications.length === 0 ? (
              <ViewerLocalizedText as="p" en="No applications found." ur="کوئی درخواست نہیں ملی۔" className="col-span-full px-4 py-10 text-center text-sm text-[#8a9bb3]" />
            ) : (
              applications.map((application) => (
                <ApplicationGridCard key={application.id} application={application} />
              ))
            )}
          </div>
        ) : (
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm text-[#506784]">
            <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
              <tr>
                <th className="px-4 py-3"><ViewerLocalizedText en="Application" ur="درخواست" /></th>
                <th className="px-4 py-3"><ViewerLocalizedText en="Field Worker" ur="فیلڈ ورکر" /></th>
                <th className="px-4 py-3"><ViewerLocalizedText en="Department" ur="شعبہ" /></th>
                <th className="px-4 py-3"><ViewerLocalizedText en="Status" ur="حیثیت" /></th>
                <th className="px-4 py-3"><ViewerLocalizedText en="Complete" ur="مکمل" /></th>
                <th className="px-4 py-3"><ViewerLocalizedText en="Updated" ur="تازہ کاری" /></th>
                <th className="px-4 py-3"><ViewerLocalizedText en="Action" ur="عمل" /></th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8a9bb3]">
                    <ViewerLocalizedText en="No applications found." ur="کوئی درخواست نہیں ملی۔" />
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
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
                        <Link href={`/viewer/applications/${application.id}`} className="rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff]">
                          <ViewerLocalizedText en="View" ur="دیکھیں" />
                        </Link>
                        <ApplicationReviewDownloadButton
                          applicationId={application.id}
                          fileName={application.registrationNumber ?? application.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        <div className="flex items-center justify-between border-t border-[#edf2f7] px-4 py-3 text-sm text-[#5f718a]">
          <span>{total === 0 ? 'No records' : `Showing ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} of ${total}`}</span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link href={pageHref(page - 1)} className="rounded-lg border border-[#dbe4ef] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f9fd]">
                <ViewerLocalizedText en="Previous" ur="پچھلا" />
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-3 py-1.5 text-xs font-semibold text-[#c2d0e0]"><ViewerLocalizedText en="Previous" ur="پچھلا" /></span>
            )}
            {hasNext ? (
              <Link href={pageHref(page + 1)} className="rounded-lg border border-[#dbe4ef] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f9fd]">
                <ViewerLocalizedText en="Next" ur="اگلا" />
              </Link>
            ) : (
              <span className="rounded-lg border border-[#edf2f7] px-3 py-1.5 text-xs font-semibold text-[#c2d0e0]"><ViewerLocalizedText en="Next" ur="اگلا" /></span>
            )}
          </div>
        </div>
      </div>
    </ViewerShell>
  );
}

function ApplicationGridCard({ application }: { application: ApplicationListItem }) {
  return (
    <article className="flex min-h-full flex-col rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-[0_14px_32px_rgba(15,31,51,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,31,51,0.10)]">
      <Link href={`/viewer/applications/${application.id}`} className="block min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#0f1f33]">{application.childName ?? 'No child name'}</p>
            <p className="mt-1 truncate text-xs font-medium text-[#8a9bb3]">{application.registrationNumber ?? application.id}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#edf4ff] px-2.5 py-1 text-[11px] font-bold text-[#2563eb]">
            {application.completionPercentage}%
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <CardDetail label="Age" value={application.age != null ? `${application.age} years` : '-'} />
            <CardDetail label="Gender" value={application.gender ?? '-'} />
          </div>
          <CardDetail label="B-form" value={application.bFormNumber ?? '-'} />
          <div className="grid grid-cols-2 gap-2">
            <CardDetail label="Health" value={application.healthStatus ?? '-'} />
            <CardDetail label="Class" value={application.currentClass ?? '-'} />
          </div>
          <CardDetail label="School / Madrasa" value={application.schoolName ?? application.madrasaName ?? '-'} />
          <div className="grid grid-cols-2 gap-2">
            <CardDetail label="Siblings" value={application.totalSiblings != null ? String(application.totalSiblings) : '-'} />
            <CardDetail label="Lives with mother" value={application.childLivesWithMother == null ? '-' : application.childLivesWithMother ? 'Yes' : 'No'} />
          </div>
          <CardDetail label="Location" value={applicationLocation(application)} />
        </div>

      </Link>

      <div className="mt-4 flex items-center gap-2 border-t border-[#edf2f7] pt-3">
        <Link href={`/viewer/applications/${application.id}`} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff]">
          <ViewerLocalizedText en="View details" ur="تفصیل دیکھیں" />
        </Link>
        <ApplicationReviewDownloadButton
          applicationId={application.id}
          fileName={application.registrationNumber ?? application.id}
          label="PDF"
          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
        />
      </div>
    </article>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f8fbff] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9bb3]">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-[#0f1f33]">{value}</p>
    </div>
  );
}
