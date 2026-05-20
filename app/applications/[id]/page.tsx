import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CopyPlus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import ApplicationStatusActions from '@/components/application-status-actions';
import ApplicationMigrationFields from '@/components/application-migration-fields';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface ApplicationDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) notFound();

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) notFound();

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin && application.createdById !== session.user.id) notFound();

  const applicationDocuments = await getApplicationDocuments(application.id);
  const canEdit = application.status === 'draft' || application.status === 'needs_correction' || (isAdmin && ['reviewer_approved', 'admin_approved', 'validated'].includes(application.status));

  return (
    <AppShell
      title={application.registrationNumber ?? 'Application Review'}
      description="Review the application in the same step-by-step format used during form entry."
      maxWidth="max-w-7xl"
      actions={
        <>
          <Link href="/applications" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
            Back to List
          </Link>
          <Link href={`/applications/${application.id}/duplicate`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 sm:w-auto">
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Add Child From Same Family
          </Link>
          {canEdit ? (
            <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 sm:w-auto">
              {application.status === 'draft' ? 'Edit Draft' : application.status === 'needs_correction' ? 'Correct Application' : 'Edit'}
            </Link>
          ) : null}
        </>
      }
    >
      <div className={`grid min-w-0 gap-5 ${isAdmin ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <OrphanApplicationWizard
          initialData={applicationToWizardData(application)}
          initialDocuments={documentsToWizardDocuments(applicationDocuments)}
          initialApplicationId={application.id}
          readOnly
        />

        {isAdmin ? (
          <aside className="min-w-0 space-y-5">
            <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="admin" />
            <ApplicationMigrationFields
              applicationId={application.id}
              initialMigrationStatus={application.migrationStatus}
              initialMainSaibanId={application.mainSaibanId ?? ''}
              initialMigrationErrors={application.migrationErrors ?? ''}
            />
          </aside>
        ) : null}
      </div>
    </AppShell>
  );
}

