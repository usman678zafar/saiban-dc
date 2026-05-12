import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import AppShell from '@/components/app-shell';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export default async function NewApplicationPage() {
  const session = await getServerSession(authOptions);
  const fieldWorker = session?.user?.id
    ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        phoneNumber: true,
        cnic: true,
      },
    })
    : null;

  return (
    <AppShell
      title="New Orphan Application"
      description="Follow the numbered steps from collector details through review and submission."
      maxWidth="max-w-5xl"
    >
      <OrphanApplicationWizard
        initialData={{
          collectorName: fieldWorker?.name ?? '',
          collectorCnic: fieldWorker?.cnic ?? '',
          collectorContact: fieldWorker?.phoneNumber ?? '',
        }}
      />
    </AppShell>
  );
}
