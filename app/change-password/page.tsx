import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { KeyRound } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import ForcePasswordChangeForm from '@/components/force-password-change-form';

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin');
  const canUseForcedPasswordFlow = ['reviewer', 'supervisor'].includes(session.user.role ?? '');
  if (!session.user.passwordChangeRequired || !canUseForcedPasswordFlow) {
    redirect(session.user.role === 'supervisor' ? '/supervisor' : session.user.role === 'reviewer' ? '/reviewer' : '/admin');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <KeyRound size={18} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-slate-950">Change temporary password</h1>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Enter your current temporary password, usually the last 4 digits of your phone number, then set a new password.
            </p>
          </div>
        </div>
        <ForcePasswordChangeForm />
      </section>
    </main>
  );
}
