import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import AppShell from '@/components/app-shell';
import SupervisorShell from '@/components/supervisor-shell';
import ReviewerShell from '@/components/reviewer-shell';
import { authOptions } from '@/lib/auth';
import { getApplicationCollectorPrefill } from '@/lib/application-prefill';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import ApplicationIntakeClosed from '@/components/application-intake-closed';
import { isNewApplicationIntakeEnabled } from '@/lib/application-intake';

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

  const intakeEnabled = isNewApplicationIntakeEnabled();
  const collectorPrefill = intakeEnabled ? await getApplicationCollectorPrefill(session) : null;
  const content = intakeEnabled
    ? <OrphanApplicationWizard initialData={collectorPrefill!} />
    : <ApplicationIntakeClosed />;
  const title = intakeEnabled ? '+ Application' : 'Application intake';
  const description = intakeEnabled
    ? 'Follow the numbered steps through review and submission.'
    : 'New applications are temporarily paused. Existing drafts remain available.';

  if (session.user.role === 'supervisor') {
    return (
      <SupervisorShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
        canManageFieldWorkers={Boolean(session.user.canManageFieldWorkers)}
      >
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">{description}</p>
        </header>
        {content}
      </SupervisorShell>
    );
  }

  if (session.user.role === 'reviewer') {
    return (
      <ReviewerShell
        email={session.user.email}
        name={session.user.name}
        canCreateApplications={Boolean(session.user.canCreateApplications)}
      >
        <header className="mb-5 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">{description}</p>
        </header>
        {content}
      </ReviewerShell>
    );
  }

  return (
    <AppShell
      title={intakeEnabled ? 'New Orphan Application' : 'Application intake'}
      description={description}
      maxWidth="max-w-5xl"
    >
      {content}
    </AppShell>
  );
}

