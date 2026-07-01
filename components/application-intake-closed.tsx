import Image from 'next/image';
import Link from 'next/link';
import { NEW_APPLICATIONS_CLOSED_MESSAGE } from '@/lib/application-intake';
import pausedRegistrationImage from '@/assests/abcd.png';

type ApplicationIntakeClosedProps = {
  backHref?: string;
  backLabel?: string;
  compact?: boolean;
};

export default function ApplicationIntakeClosed({
  backHref = '/applications',
  backLabel = 'View existing applications',
  compact = false,
}: ApplicationIntakeClosedProps) {
  if (compact) {
    return (
      <section className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-amber-950 shadow-sm sm:p-4" aria-label="New applications temporarily paused">
        <Image
          src={pausedRegistrationImage}
          alt="Registration desk with an hourglass"
          className="registration-paused-image h-20 w-20 shrink-0 object-contain drop-shadow-sm sm:h-24 sm:w-24"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold">New applications are temporarily paused</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">You can continue, complete, and submit any existing draft.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 text-center shadow-[0_20px_55px_-30px_rgba(15,23,42,0.4)] sm:p-8" aria-labelledby="application-intake-closed-title">
      <div className="relative mx-auto flex h-44 w-44 items-center justify-center sm:h-48 sm:w-48">
        <span className="registration-image-glow absolute inset-3 rounded-full bg-amber-200/60 blur-2xl" aria-hidden="true" />
        <Image
          src={pausedRegistrationImage}
          alt="Registration desk with an hourglass"
          className="registration-paused-image relative h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(15,23,42,0.14)]"
          priority
        />
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">
        <span className="registration-status-dot h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        Temporarily paused
      </div>
      <h2 id="application-intake-closed-title" className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
        New applications are temporarily paused
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{NEW_APPLICATIONS_CLOSED_MESSAGE}</p>
      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
        Already started an application? Open your drafts to finish the remaining information and submit as usual.
      </div>
      <Link href={backHref} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
        {backLabel}
      </Link>
    </section>
  );
}
