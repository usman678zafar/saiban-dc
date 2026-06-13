import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CopyPlus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import SupervisorShell from '@/components/supervisor-shell';
import ReviewerShell from '@/components/reviewer-shell';
import ApplicationActivityTimeline from '@/components/application-activity-timeline';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';
import ApplicationFieldWorkerDetails from '@/components/application-field-worker-details';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import VolunteerApplicationStatus from '@/components/volunteer-application-status';
import DeleteDraftApplicationButton from '@/components/delete-draft-application-button';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface ApplicationDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/applications/${params.id}`);

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

  const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
  const isSuperAdmin = session.user.role === 'super_admin';
  if (!isAdmin && application.createdById !== session.user.id) notFound();

  const applicationDocuments = await getApplicationDocuments(application.id);
  const canEdit = isSuperAdmin || (!isAdmin && (application.status === 'draft' || application.status === 'needs_correction'));
  const actions = (
    <>
      {!isAdmin ? <VolunteerApplicationStatus status={application.status} /> : null}
      <Link href="/applications" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
        Back to List
      </Link>
      <ApplicationReviewDownloadButton
        applicationId={application.id}
        fileName={application.registrationNumber ?? application.id}
        label="Download"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      />
      <Link href={`/applications/${application.id}/duplicate`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 sm:w-auto">
        <CopyPlus className="h-4 w-4" aria-hidden="true" />
        Add Child From Same Family
      </Link>
      {canEdit ? (
        <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 sm:w-auto">
          {application.status === 'draft' ? 'Edit Draft' : application.status === 'needs_correction' ? 'Correct Application' : 'Edit'}
        </Link>
      ) : null}
      {isSuperAdmin ? (
        <DeleteDraftApplicationButton
          applicationId={application.id}
          redirectTo="/applications"
          title="Delete application"
          confirmationText="Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone."
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        />
      ) : null}
    </>
  );
  const content = (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <OrphanApplicationWizard
        initialData={applicationToWizardData(application)}
        initialDocuments={documentsToWizardDocuments(applicationDocuments)}
        initialApplicationId={application.id}
        readOnly
      />

      <aside className="min-w-0 space-y-5">
        <ApplicationFieldWorkerDetails application={application} createdBy={application.createdBy} />
        <ApplicationActivityTimeline
          createdAt={application.createdAt}
          updatedAt={application.updatedAt}
          status={application.status}
          createdByName={application.createdBy.name ?? application.createdBy.fieldWorkerId}
          auditLogs={application.auditLogs}
        />
        {isSuperAdmin ? (
          <>
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="super_admin" />
          <ApplicationMigrationFields
            applicationId={application.id}
            initialMigrationStatus={application.migrationStatus}
            initialMainSaibanId={application.mainSaibanId ?? ''}
            initialMigrationErrors={application.migrationErrors ?? ''}
          />
          </>
        ) : null}
      </aside>
    </div>
  );

  if (session.user.role === 'supervisor') {
    return (
      <SupervisorShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
        canManageFieldWorkers={Boolean(session.user.canManageFieldWorkers)}
      >
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-[#0f1f33] [overflow-wrap:anywhere] sm:text-3xl">
              {application.registrationNumber ?? 'Application Review'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">Review the application in the same step-by-step format used during form entry.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">{actions}</div>
        </header>
        {content}
      </SupervisorShell>
    );
  }

  if (session.user.role === 'reviewer') {
    return (
      <ReviewerShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
      >
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-[#0f1f33] [overflow-wrap:anywhere] sm:text-3xl">
              {application.registrationNumber ?? 'Application Review'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">Review the application in the same step-by-step format used during form entry.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">{actions}</div>
        </header>
        {content}
      </ReviewerShell>
    );
  }

  return (
    <AppShell
      title={application.registrationNumber ?? 'Application Review'}
      description="Review the application in the same step-by-step format used during form entry."
      maxWidth="max-w-7xl"
      actions={actions}
    >
      {content}
    </AppShell>
  );
}

