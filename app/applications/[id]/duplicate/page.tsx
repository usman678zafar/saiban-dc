import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import { buildDuplicateFamilyInitialData } from '@/lib/duplicate-application';

interface DuplicateApplicationPageProps {
  params: {
    id: string;
  };
}

export default async function DuplicateApplicationPage({ params }: DuplicateApplicationPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(`/signin?callbackUrl=/applications/${params.id}/duplicate`);

  const application = await prisma.orphanApplication.findUnique({
    where: { id: params.id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
    },
  });

  if (!application) notFound();
  if (application.createdById !== session.user.id && !['admin', 'super_admin'].includes(session.user.role ?? '')) notFound();

  const initialData = buildDuplicateFamilyInitialData(application);

  return (
    <AppShell
      title="Add Another Orphan From Same Family"
      description="Shared family details are copied. Enter the new child's information, documents, and attestation."
      maxWidth="max-w-6xl"
    >
      <OrphanApplicationWizard
        initialData={initialData}
        initialStep={7}
        storageScope={`duplicate:${application.id}`}
        showInstructionsOnStart={false}
      />
    </AppShell>
  );
}

