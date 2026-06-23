import Link from 'next/link';
import { ApplicationStatus } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Edit2 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ReviewerShell from '@/components/reviewer-shell';
import BackButton from '@/components/back-button';
import ApplicationActivityTimeline from '@/components/application-activity-timeline';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationFieldWorkerDetails from '@/components/application-field-worker-details';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface ReviewerApplicationPageProps {
  params: {
    id: string;
  };
}

const reviewerVisibleApprovedStatuses = new Set<string>([
  ApplicationStatus.reviewer_approved,
  ApplicationStatus.admin_on_hold,
  ApplicationStatus.admin_approved,
  ApplicationStatus.validated,
  ApplicationStatus.migrated,
]);

const reviewerHistoryActions = new Set([
  'approved_by_reviewer',
  'reviewer_approved_by_super_admin',
  'rejected_by_reviewer',
]);

export default async function ReviewerApplicationPage({ params }: ReviewerApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/reviewer/applications/${params.id}`);
  if (!['reviewer', 'admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/applications');
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, name: true, canCreateApplications: true },
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
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { name: true, role: true, fieldWorkerId: true },
          },
        },
      },
    },
  });

  if (!application) notFound();
  const hasReviewerHistory = application.auditLogs.some((log) => reviewerHistoryActions.has(log.action));
  const isReviewerVisibleStatus = application.status === ApplicationStatus.supervisor_approved
    || reviewerVisibleApprovedStatuses.has(application.status)
    || (application.status === ApplicationStatus.rejected && hasReviewerHistory);
  if (!isReviewerVisibleStatus) notFound();
  if (!['admin', 'super_admin'].includes(user?.role ?? '') && application.createdById === user?.id) notFound();
  const canActOnApplication = application.status === ApplicationStatus.supervisor_approved;

  const applicationDocuments = await getApplicationDocuments(application.id);

  return (
    <ReviewerShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications}>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-[#0f1f33] [overflow-wrap:anywhere] sm:text-3xl">{application.registrationNumber ?? application.id}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f718a]">Review the supervisor-approved record and revisit approved or rejected reviewer decisions.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <BackButton fallbackHref="/reviewer/applications" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Back
          </BackButton>
          <ApplicationReviewDownloadButton
            applicationId={application.id}
            fileName={application.registrationNumber ?? application.id}
            label="Download"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          />
          {canActOnApplication ? (
            <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              <Edit2 className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          ) : null}
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
          {canActOnApplication ? <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="reviewer" /> : null}
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
    </ReviewerShell>
  );
}
