import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import RoleLogin from '@/components/role-login';
import { authOptions } from '@/lib/auth';

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    redirect('/applications');
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
      <RoleLogin />
    </main>
  );
}
