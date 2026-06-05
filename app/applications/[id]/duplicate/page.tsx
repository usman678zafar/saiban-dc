import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/app-shell';
import SupervisorShell from '@/components/supervisor-shell';
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
  const canCreateApplications = session.user.role === 'field_worker'
    || session.user.role === 'admin'
    || session.user.role === 'super_admin'
    || ((session.user.role === 'supervisor' || session.user.role === 'reviewer') && Boolean(session.user.canCreateApplications));
  if (!canCreateApplications) notFound();
  if (application.createdById !== session.user.id && !['admin', 'super_admin'].includes(session.user.role ?? '')) notFound();

  const initialData = buildDuplicateFamilyInitialData(application);
  const content = (
    <OrphanApplicationWizard
      initialData={initialData}
      initialStep={7}
      storageScope={`duplicate:${application.id}:${application.updatedAt.getTime()}`}
      showInstructionsOnStart={false}
    />
  );

  if (session.user.role === 'supervisor') {
    return (
      <SupervisorShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
        canManageFieldWorkers={Boolean(session.user.canManageFieldWorkers)}
      >
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Add Another Orphan From Same Family</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Shared family details are copied. Enter the new child's information, documents, and attestation.</p>
        </header>
        {content}
      </SupervisorShell>
    );
  }

  return (
    <AppShell
      title="Add Another Orphan From Same Family"
      description="Shared family details are copied. Enter the new child's information, documents, and attestation."
      maxWidth="max-w-6xl"
    >
      {content}
    </AppShell>
  );
}

