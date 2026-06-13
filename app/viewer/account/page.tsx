import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { KeyRound, Languages } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ViewerShell from '@/components/viewer-shell';
import ForcePasswordChangeForm from '@/components/force-password-change-form';
import { ViewerLanguageButton, ViewerLocalizedText } from '@/components/viewer-language';

export default async function ViewerAccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/viewer/account');
  if (session.user.role !== 'viewer') redirect('/dashboard');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      phoneNumber: true,
    },
  });

  return (
    <ViewerShell email={session.user.email}>
      <header className="mb-5 flex flex-col gap-2">
        <ViewerLocalizedText as="h1" en="Account" ur="اکاؤنٹ" className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl" />
        <ViewerLocalizedText
          as="p"
          en="Manage your viewer password and portal language."
          ur="اپنا ناظر پاس ورڈ اور پورٹل زبان منظم کریں۔"
          className="max-w-3xl text-sm leading-6 text-[#5f718a]"
        />
      </header>

      <div className="grid max-w-3xl gap-4">
        <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#2563eb]">
                <Languages size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <ViewerLocalizedText as="h2" en="Language" ur="زبان" className="text-base font-semibold text-[#0f1f33]" />
                <ViewerLocalizedText
                  as="p"
                  en="Change the viewer portal language for headings, KPIs, navigation, and map labels."
                  ur="ہیڈنگز، KPIs، نیویگیشن، اور نقشے کے لیبلز کے لیے ناظر پورٹل کی زبان تبدیل کریں۔"
                  className="mt-1 text-xs leading-5 text-[#5f718a]"
                />
              </div>
            </div>
            <ViewerLanguageButton />
          </div>
        </section>

        <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#2563eb]">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <ViewerLocalizedText as="h2" en="Change password" ur="پاس ورڈ تبدیل کریں" className="text-base font-semibold text-[#0f1f33]" />
              <p className="mt-1 break-words text-xs leading-5 text-[#5f718a] [overflow-wrap:anywhere]">
                <ViewerLocalizedText en="Signed in as" ur="لاگ ان" /> {user?.phoneNumber ?? user?.email ?? session.user.email}
              </p>
            </div>
          </div>
          <ForcePasswordChangeForm />
        </section>
      </div>
    </ViewerShell>
  );
}
