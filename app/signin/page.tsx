import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import RoleLogin from '@/components/role-login';
import backgroundImage from '@/assests/background.jpg';
import { authOptions } from '@/lib/auth';

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    redirect('/applications');
  }

  return (
    <main
      className="min-h-screen bg-slate-100 bg-cover bg-center bg-no-repeat px-3 py-2 text-slate-900 sm:px-4 sm:py-3"
      style={{ backgroundImage: `url(${backgroundImage.src})` }}
    >
      <RoleLogin />
    </main>
  );
}

