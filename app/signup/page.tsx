import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SignupForm from '@/components/signup-form';
import backgroundImage from '@/assests/background.jpg';

export default async function SignupPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect('/applications');

  return (
    <main
      className="min-h-screen bg-slate-100 bg-cover bg-center bg-no-repeat px-3 py-2 text-slate-900 sm:px-4 sm:py-3"
      style={{ backgroundImage: `url(${backgroundImage.src})` }}
    >
      <SignupForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
    </main>
  );
}

