import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ViewerShell from '@/components/viewer-shell';
import { ViewerLocalizedText } from '@/components/viewer-language';
import BackButton from '@/components/back-button';
import ApplicationActivityTimeline from '@/components/application-activity-timeline';
import ApplicationFieldWorkerDetails from '@/components/application-field-worker-details';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface ViewerApplicationDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ViewerApplicationDetailPage({ params }: ViewerApplicationDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/viewer/applications/${params.id}`);
  if (session.user.role !== 'viewer') redirect('/dashboard');

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

  return (
    <ViewerShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{application.registrationNumber ?? application.id}</h1>
          <ViewerLocalizedText as="p" en="View the full application record, documents, and activity history." ur="درخواست کا مکمل ریکارڈ، دستاویزات، اور سرگرمی کی تاریخ دیکھیں۔" className="mt-2 text-sm text-slate-600" />
        </div>
        <div className="flex flex-wrap gap-3">
          <BackButton fallbackHref="/viewer/applications" className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            <ViewerLocalizedText en="Back" ur="واپس" />
          </BackButton>
          <ApplicationReviewDownloadButton
            applicationId={application.id}
            fileName={application.registrationNumber ?? application.id}
            label="Download"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrphanApplicationWizard
          initialData={applicationToWizardData(application)}
          initialDocuments={documentsToWizardDocuments(applicationDocuments)}
          initialApplicationId={application.id}
          initialCreatedAt={application.createdAt}
          initialCompletionPercentage={application.filledFieldsPercentage}
          initialApplicationStatus={application.status}
          readOnly
        />

        <aside className="space-y-6">
          <ApplicationFieldWorkerDetails application={application} createdBy={application.createdBy} />
          <ApplicationActivityTimeline
            createdAt={application.createdAt}
            updatedAt={application.updatedAt}
            status={application.status}
            createdByName={application.createdBy.name ?? application.createdBy.fieldWorkerId}
            auditLogs={application.auditLogs}
          />
        </aside>
      </div>
    </ViewerShell>
  );
}
