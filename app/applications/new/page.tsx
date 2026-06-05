import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import AppShell from '@/components/app-shell';
import SupervisorShell from '@/components/supervisor-shell';
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
  const content = <OrphanApplicationWizard initialData={collectorPrefill} />;

  if (session.user.role === 'supervisor') {
    return (
      <SupervisorShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
        canManageFieldWorkers={Boolean(session.user.canManageFieldWorkers)}
      >
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">+ Application</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Follow the numbered steps through review and submission.</p>
        </header>
        {content}
      </SupervisorShell>
    );
  }

  return (
    <AppShell
      title="New Orphan Application"
      description="Follow the numbered steps through review and submission."
      maxWidth="max-w-5xl"
    >
      {content}
    </AppShell>
  );
}

