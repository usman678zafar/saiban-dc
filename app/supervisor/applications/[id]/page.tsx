import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import ApplicationStatusActions from '@/components/application-status-actions';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';
import { projectMatchesReviewAssignment } from '@/lib/field-workers';

interface SupervisorApplicationPageProps {
  params: {
    id: string;
  };
}

export default async function SupervisorApplicationPage({ params }: SupervisorApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/supervisor/applications/${params.id}`);
  if (session.user.role !== 'supervisor' && session.user.role !== 'admin') redirect('/applications');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { project: true, role: true },
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
  if (application.status !== 'submitted') notFound();
  if (user?.role !== 'admin' && !projectMatchesReviewAssignment(application.collectorProject, user?.project)) notFound();

  const applicationDocuments = await getApplicationDocuments(application.id);

  return (
    <AppShell
      title={application.registrationNumber ?? application.id}
      description="Review the submitted record in the same step-by-step format used during form entry."
      maxWidth="max-w-7xl"
      actions={
        <Link href="/supervisor" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Back
        </Link>
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
          <ApplicationStatusActions applicationId={application.id} currentStatus={application.status} actorRole="supervisor" />
        </aside>
      </div>
    </AppShell>
  );
}

