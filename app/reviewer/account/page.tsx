import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { KeyRound } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ReviewerShell from '@/components/reviewer-shell';
import ForcePasswordChangeForm from '@/components/force-password-change-form';

export default async function ReviewerAccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/reviewer/account');
  if (session.user.role !== 'reviewer') redirect('/reviewer/applications');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      phoneNumber: true,
      canCreateApplications: true,
    },
  });

  return (
    <ReviewerShell email={session.user.email} name={user?.name} canCreateApplications={user?.canCreateApplications}>
      <header className="mb-5 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Account</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">Update your reviewer account password.</p>
      </header>

      <section className="max-w-xl rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#2563eb]">
            <KeyRound size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#0f1f33]">Change password</h2>
            <p className="mt-1 break-words text-xs leading-5 text-[#5f718a] [overflow-wrap:anywhere]">
              Signed in as {user?.phoneNumber ?? user?.email ?? session.user.email}
            </p>
          </div>
        </div>
        <ForcePasswordChangeForm />
      </section>
    </ReviewerShell>
  );
}
