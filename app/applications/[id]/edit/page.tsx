import { notFound, redirect } from 'next/navigation';
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
    redirect(`/signin?callbackUrl=/applications/${params.id}/edit`);
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

  const canReviewerEdit = session.user.role === 'reviewer' && application.status === 'supervisor_approved';
  const canAdminEdit = session.user.role === 'admin' && ['reviewer_approved', 'admin_approved', 'validated'].includes(application.status);
  const canSuperAdminEdit = session.user.role === 'super_admin';
  const canCreateApplications = session.user.role === 'field_worker'
    || session.user.role === 'admin'
    || session.user.role === 'super_admin'
    || ((session.user.role === 'supervisor' || session.user.role === 'reviewer') && Boolean(session.user.canCreateApplications));
  const canOwnerEdit = application.createdById === session.user.id && canCreateApplications;

  if (!canOwnerEdit && !canReviewerEdit && !canAdminEdit && !canSuperAdminEdit) {
    notFound();
  }

  if (canOwnerEdit && !['draft', 'needs_correction'].includes(application.status) && session.user.role !== 'super_admin') {
    redirect(`/applications/${application.id}`);
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

