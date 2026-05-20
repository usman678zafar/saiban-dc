import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppShell from '@/components/app-shell';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import { getApplicationDocuments } from '@/lib/application-documents';
import { applicationToWizardData, documentsToWizardDocuments } from '@/lib/application-wizard-data';

interface EditApplicationPageProps {
  params: {
    id: string;
  };
}

export default async function EditApplicationPage({ params }: EditApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    notFound();
  }

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) {
    notFound();
  }

  if (application.createdById !== session.user.id && session.user.role !== 'admin') {
    notFound();
  }

  if (session.user.role !== 'admin' && !['draft', 'needs_correction'].includes(application.status)) {
    notFound();
  }

  const applicationDocuments = await getApplicationDocuments(application.id);
  const initialData = applicationToWizardData(application);
  const initialDocuments = documentsToWizardDocuments(applicationDocuments);

  return (
    <AppShell
      title="Edit Orphan Application"
      description={`Update draft information and save changes for application ${application.registrationNumber ?? application.id}.`}
      maxWidth="max-w-6xl"
    >
      <OrphanApplicationWizard
        initialData={initialData}
        initialDocuments={initialDocuments}
        initialApplicationId={application.id}
      />
    </AppShell>
  );
}
