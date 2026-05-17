import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApplicationCollectorPrefill } from '@/lib/application-prefill';
import AdminShell from '@/components/admin-shell';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';

export default async function AdminNewApplicationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications/new');
  if (session.user.role !== 'admin') redirect('/dashboard');
  const collectorPrefill = await getApplicationCollectorPrefill(session);

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Create Application</h1>
        <p className="mt-2 text-sm text-slate-600">Use the registration wizard without leaving the admin workspace.</p>
      </header>
      <OrphanApplicationWizard initialData={collectorPrefill} />
    </AdminShell>
  );
}
