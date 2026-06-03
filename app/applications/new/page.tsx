import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import AppShell from '@/components/app-shell';
import { authOptions } from '@/lib/auth';
import { getApplicationCollectorPrefill } from '@/lib/application-prefill';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function NewApplicationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/applications/new');
  const canCreateApplications = session.user.role === 'field_worker'
    || session.user.role === 'admin'
    || session.user.role === 'super_admin'
    || ((session.user.role === 'supervisor' || session.user.role === 'reviewer') && Boolean(session.user.canCreateApplications));

  if (!canCreateApplications) {
    redirect(session.user.role === 'supervisor' ? '/supervisor' : session.user.role === 'reviewer' ? '/reviewer' : '/applications');
  }

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

