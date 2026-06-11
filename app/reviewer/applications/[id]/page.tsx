import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Edit2 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import BackButton from '@/components/back-button';
import ApplicationStatusActions from '@/components/application-status-actions';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import ApplicationReviewDownloadButton from '@/components/application-review-download-button';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface ReviewerApplicationPageProps {
  params: {
    id: string;
  };
}

export default async function ReviewerApplicationPage({ params }: ReviewerApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/reviewer/applications/${params.id}`);
  if (!['reviewer', 'admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/applications');
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) notFound();
  if (application.status !== 'supervisor_approved') notFound();
  if (!['admin', 'super_admin'].includes(user?.role ?? '') && application.createdById === user?.id) notFound();

  const applicationDocuments = await getApplicationDocuments(application.id);

  return (
    <AppShell
      title={application.registrationNumber ?? application.id}
      description="Review the supervisor-approved record in the same step-by-step format used during form entry."
      maxWidth="max-w-7xl"
      actions={
        <>
          <BackButton fallbackHref="/reviewer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Back
          </BackButton>
          <ApplicationReviewDownloadButton
            applicationId={application.id}
            fileName={application.registrationNumber ?? application.id}
            label="Download"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          />
          <Link href={`/applications/${application.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            <Edit2 className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrphanApplicationWizard
          initialData={applicationToWizardData(application)}
          initialDocuments={documentsToWizardDocuments(applicationDocuments)}
          initialApplicationId={application.id}
          readOnly
        />

        <aside>
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="reviewer" />
        </aside>
      </div>
    </AppShell>
  );
}
