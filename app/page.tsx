import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    if (session.user.role === 'supervisor') redirect('/supervisor');
    if (session.user.role === 'reviewer') redirect('/reviewer');
    if (session.user.role === 'admin' || session.user.role === 'super_admin') redirect('/admin');
    redirect('/applications');
  }

  redirect('/signin');
}

