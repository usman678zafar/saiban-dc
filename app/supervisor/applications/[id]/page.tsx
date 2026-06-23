import { notFound, redirect } from 'next/navigation';
import { ApplicationStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SupervisorShell from '@/components/supervisor-shell';
import BackButton from '@/components/back-button';
import ApplicationActivityTimeline from '@/components/application-activity-timeline';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationFieldWorkerDetails from '@/components/application-field-worker-details';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import SameFamilyApplicationsPanel from '@/components/same-family-indicator';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';
import { projectMatchesAnyReviewAssignment } from '@/lib/field-workers';
import { getSameFamilyApplications } from '@/lib/same-family-applications';

interface SupervisorApplicationPageProps {
  params: {
    id: string;
  };
}

const supervisorApprovedStatuses = new Set<string>([
  ApplicationStatus.supervisor_approved,
  ApplicationStatus.reviewer_approved,
  ApplicationStatus.admin_on_hold,
  ApplicationStatus.admin_approved,
  ApplicationStatus.validated,
  ApplicationStatus.migrated,
]);

export default async function SupervisorApplicationPage({ params }: SupervisorApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/supervisor/applications/${params.id}`);
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

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
      createdBy: {
        select: { name: true, fieldWorkerId: true, phoneNumber: true, cnic: true, project: true, selfRegistered: true },
      },
      auditLogs: {
        orderBy: { createdAt: 'asc' },
        include: {
          actor: {
            select: { name: true, role: true, fieldWorkerId: true },
          },
        },
      },
    },
  });

  if (!application) notFound();
  if (application.status === ApplicationStatus.draft) notFound();
  const isPrivilegedSupervisorView = ['admin', 'super_admin'].includes(user?.role ?? '');
  if (!isPrivilegedSupervisorView && application.createdById === user?.id) notFound();
  const assignedProjects = user?.supervisorDepartments.length
    ? user.supervisorDepartments.map((department) => department.project)
    : user?.project ? [user.project] : [];
  if (!isPrivilegedSupervisorView && !projectMatchesAnyReviewAssignment(application.collectorProject, assignedProjects, application.createdBy.selfRegistered)) notFound();

  if (!isPrivilegedSupervisorView) {
    const hasSupervisorReturn = application.auditLogs.some((log) => log.action === 'returned_by_supervisor');
    const hasAdminReturnToSupervisor = application.auditLogs.some((log) => log.action === 'returned_by_admin_to_supervisor' || log.action === 'returned_by_super_admin_to_supervisor');
    const hasOwnReturn = application.auditLogs.some((log) => log.action === 'returned_by_supervisor' && log.actorId === user?.id);
    const hasOwnApproval = application.auditLogs.some((log) => log.action === 'approved_by_supervisor' && log.actorId === user?.id);
    const hasOwnRejection = application.auditLogs.some((log) => log.action === 'rejected_by_supervisor' && log.actorId === user?.id);
    const isVisibleToSupervisor = application.status === ApplicationStatus.submitted
      ? hasAdminReturnToSupervisor || !hasSupervisorReturn || hasOwnReturn
      : application.status === ApplicationStatus.needs_correction
        ? hasOwnReturn
        : supervisorApprovedStatuses.has(application.status)
          ? hasOwnApproval
          : application.status === ApplicationStatus.rejected
            ? hasOwnRejection || hasOwnApproval
            : hasOwnApproval;

    if (!isVisibleToSupervisor) notFound();
  }

  const [applicationDocuments, sameFamilyApplications] = await Promise.all([
    getApplicationDocuments(application.id),
    getSameFamilyApplications(application),
  ]);

  return (
    <SupervisorShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications} canManageFieldWorkers={user?.canManageFieldWorkers}>
      <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-[#0f1f33] [overflow-wrap:anywhere] sm:text-3xl">{application.registrationNumber ?? application.id}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5f718a]">Review the submitted record in the same step-by-step format used during form entry.</p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          <BackButton fallbackHref="/supervisor" className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold leading-5 text-white hover:bg-slate-800 lg:w-auto">
            Back
          </BackButton>
          <ApplicationReviewDownloadButton
            applicationId={application.id}
            fileName={application.registrationNumber ?? application.id}
            label="Download"
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold leading-5 text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 lg:w-auto"
          />
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrphanApplicationWizard
          initialData={applicationToWizardData(application)}
          initialDocuments={documentsToWizardDocuments(applicationDocuments)}
          initialApplicationId={application.id}
          readOnly
        />

        <aside className="min-w-0 space-y-5">
          <ApplicationFieldWorkerDetails application={application} createdBy={application.createdBy} defaultCollapsed />
          <SameFamilyApplicationsPanel applications={sameFamilyApplications} hrefPrefix="/supervisor/applications" />
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="supervisor" />
          <ApplicationActivityTimeline
            createdAt={application.createdAt}
            updatedAt={application.updatedAt}
            status={application.status}
            createdByName={application.createdBy.name ?? application.createdBy.fieldWorkerId}
            auditLogs={application.auditLogs}
            defaultCollapsed
          />
        </aside>
      </div>
    </SupervisorShell>
  );
}

