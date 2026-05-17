import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SignupForm from '@/components/signup-form';

export default async function SignupPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect('/applications');

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
      <SignupForm />
    </main>
  );
}
