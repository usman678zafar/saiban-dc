import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import AppShell from '@/components/app-shell';
import { authOptions } from '@/lib/auth';
import { getApplicationCollectorPrefill } from '@/lib/application-prefill';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function NewApplicationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/applications/new');

  const collectorPrefill = await getApplicationCollectorPrefill(session);

  return (
    <AppShell
      title="New Orphan Application"
      description="Follow the numbered steps through review and submission."
      maxWidth="max-w-5xl"
    >
      <OrphanApplicationWizard initialData={collectorPrefill} />
    </AppShell>
  );
}

