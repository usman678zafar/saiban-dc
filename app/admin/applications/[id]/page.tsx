import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CopyPlus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import BackButton from '@/components/back-button';
import ApplicationActivityTimeline from '@/components/application-activity-timeline';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';
import ApplicationFieldWorkerDetails from '@/components/application-field-worker-details';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import DeleteDraftApplicationButton from '@/components/delete-draft-application-button';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface AdminApplicationDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AdminApplicationDetailPage({ params }: AdminApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/admin/applications/${params.id}`);
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');
  const isSuperAdmin = session.user.role === 'super_admin';

  const application = await prisma.orphanApplication.findFirst({
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

  const applicationDocuments = await getApplicationDocuments(application.id);
  const canEdit = isSuperAdmin || ['reviewer_approved', 'admin_on_hold'].includes(application.status);

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-slate-950 [overflow-wrap:anywhere]">{application.registrationNumber ?? application.id}</h1>
          <p className="mt-2 text-sm text-slate-600">Open the full application record, activity history, and available review actions.</p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
          <BackButton fallbackHref="/admin/applications" className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold leading-5 text-white hover:bg-slate-800 lg:w-auto">
            Back
          </BackButton>
          <ApplicationReviewDownloadButton
            applicationId={application.id}
            fileName={application.registrationNumber ?? application.id}
            label="Download"
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold leading-5 text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 lg:w-auto"
          />
          <Link href={`/applications/${application.id}/duplicate`} className="group inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-3 text-center text-sm font-semibold leading-5 text-white shadow-sm shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:w-auto">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-white/15 transition group-hover:bg-white/20">
              <CopyPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="whitespace-normal">Add Orphan From Same Family</span>
          </Link>
          {canEdit ? (
            <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold leading-5 text-white hover:bg-blue-500 lg:w-auto">
              Edit
            </Link>
          ) : null}
          {isSuperAdmin ? (
            <DeleteDraftApplicationButton
              applicationId={application.id}
              redirectTo="/admin/applications"
              title="Delete application"
              requiresPassword={application.status !== 'draft'}
              confirmationText="Are you sure you want to permanently delete this application, including its documents and activity history? This action cannot be undone."
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-lg bg-rose-600 px-4 py-3 text-center text-sm font-semibold leading-5 text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            />
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

        <aside className="space-y-6">
          <ApplicationFieldWorkerDetails application={application} createdBy={application.createdBy} defaultCollapsed />
          <ApplicationActivityTimeline
            createdAt={application.createdAt}
            updatedAt={application.updatedAt}
            status={application.status}
            createdByName={application.createdBy.name ?? application.createdBy.fieldWorkerId}
            auditLogs={application.auditLogs}
            defaultCollapsed
          />
          <ApplicationStatusActions
            applicationId={application.id}
            currentStatus={application.status}
            actorRole={isSuperAdmin ? 'super_admin' : 'admin'}
          />
          {isSuperAdmin ? (
            <ApplicationMigrationFields
              applicationId={application.id}
              initialMigrationStatus={application.migrationStatus}
              initialMainSaibanId={application.mainSaibanId ?? ''}
              initialMigrationErrors={application.migrationErrors ?? ''}
            />
          ) : null}
        </aside>
      </div>
    </AdminShell>
  );
}

