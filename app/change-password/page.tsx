import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ForcePasswordChangeForm from '@/components/force-password-change-form';

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin');
  if (!session.user.passwordChangeRequired) {
    redirect(session.user.role === 'supervisor' ? '/supervisor' : session.user.role === 'reviewer' ? '/reviewer' : '/admin');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Password required</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-950">Change your temporary password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This account is using a temporary password. Set a new password before continuing.
        </p>
        <ForcePasswordChangeForm />
      </section>
    </main>
  );
}
