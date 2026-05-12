import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminShell from '@/components/admin-shell';
import OrphanApplicationWizard from '@/components/orphan-application-wizard';

export default async function AdminNewApplicationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/applications/new');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">New Application</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create Application</h1>
        <p className="mt-2 text-sm text-slate-600">Use the registration wizard without leaving the admin workspace.</p>
      </header>
      <OrphanApplicationWizard />
    </AdminShell>
  );
}
