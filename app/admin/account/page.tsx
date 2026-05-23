import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import AdminAccountForm from '@/components/admin-account-form';
import AdminShell from '@/components/admin-shell';
import { authOptions } from '@/lib/auth';

export default async function AdminAccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/account');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Account</h1>
        <p className="mt-2 text-sm text-[#5f718a]">{session.user.email}</p>
      </div>

      <AdminAccountForm />
    </AdminShell>
  );
}
