import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApplicationCollectorPrefill } from '@/lib/application-prefill';
import AdminShell from '@/components/admin-shell';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import ApplicationIntakeClosed from '@/components/application-intake-closed';
import { isNewApplicationIntakeEnabled } from '@/lib/application-intake';

export default async function AdminNewApplicationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications/new');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  if (!isNewApplicationIntakeEnabled()) {
    return (
      <AdminShell email={session.user.email} role={session.user.role}>
        <header className="mb-5 sm:mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Application intake</h1>
          <p className="mt-2 text-sm text-slate-600">New applications are temporarily paused. Existing drafts remain available.</p>
        </header>
        <ApplicationIntakeClosed backHref="/admin/applications" backLabel="View existing applications" />
      </AdminShell>
    );
  }

  const collectorPrefill = await getApplicationCollectorPrefill(session);

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Create Application</h1>
        <p className="mt-2 text-sm text-slate-600">Use the registration wizard without leaving the admin workspace.</p>
      </header>
      <OrphanApplicationWizard initialData={collectorPrefill} />
    </AdminShell>
  );
}

