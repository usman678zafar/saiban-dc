'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import logo from '@/assests/logo.png';
import baitussalamLogo from '@/assests/baitussalam.webp';
import { formatCnic, formatPakistanMobile, isValidPakistanMobile, normalizePakistanMobile } from '@/lib/contact-format';
import { useNavigationLoading } from './navigation-loading';
import { PasswordValueReveal } from './password-input';
import { FIELD_WORKER_REGISTRATION_CLOSED_MESSAGE } from '@/lib/field-worker-registration';

type SuccessInfo = {
  fieldWorkerId: string;
  name: string;
  phoneNumber: string;
  password: string;
};

const SECURITY_CHECK_FAILED_MESSAGE = 'Security check failed. Please try again.';

type SignupFormProps = {
  registrationEnabled: boolean;
  turnstileSiteKey?: string;
};

export default function SignupForm({ registrationEnabled, turnstileSiteKey }: SignupFormProps) {
  const router = useRouter();
  const { startLoading } = useNavigationLoading();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');

  const normalizedPhoneNumber = normalizePakistanMobile(phoneNumber);
  const derivedPassword = normalizedPhoneNumber.slice(-4);

  if (!registrationEnabled) {
    return <RegistrationClosed />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValidPakistanMobile(phoneNumber)) {
      setError('Enter a valid Pakistan mobile number, for example 03XX-XXXXXXX.');
      return;
    }

    setIsSubmitting(true);

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phoneNumber: normalizedPhoneNumber, cnic, address, captchaToken }),
    });

    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      const nextError = result?.message ?? 'Registration failed. Please try again.';
      setError(nextError);
      if (nextError === SECURITY_CHECK_FAILED_MESSAGE) {
        setCaptchaToken('');
        (window as { turnstile?: { reset?: () => void } }).turnstile?.reset?.();
      }
      return;
    }

    setSuccess({
      fieldWorkerId: result.fieldWorkerId,
      name: result.name,
      phoneNumber: normalizedPhoneNumber,
      password: derivedPassword,
    });
  };

  if (success) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-sm items-center px-2 sm:px-0">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <Image src={logo} alt="Saiban" width={180} height={130} className="h-14 w-auto object-contain sm:h-16" priority />
            <Image src={baitussalamLogo} alt="Baitussalam" width={156} height={114} className="h-14 w-auto object-contain sm:h-16" priority />
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-2 text-base font-semibold text-slate-900">Registration Successful</h2>
            <p className="mt-1 text-sm text-slate-500">Welcome, {success.name}!</p>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Your login details</p>
            <div className="mt-2 space-y-1.5 text-slate-700">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Phone Number</span>
                <span className="font-mono font-semibold text-slate-900">{success.phoneNumber}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Password</span>
                <PasswordValueReveal value={success.password} className="font-mono font-semibold text-slate-900" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Your password is the last 4 digits of your phone number. Save these details - you will need them to sign in.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              startLoading();
              router.push('/signin');
            }}
            className="mt-3 min-h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Sign In
          </button>
          <AuthFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-lg items-center px-2 sm:px-0">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <Image src={logo} alt="Saiban" width={180} height={130} className="h-14 w-auto object-contain sm:h-16" priority />
          <Image src={baitussalamLogo} alt="Baitussalam" width={156} height={114} className="h-14 w-auto object-contain sm:h-16" priority />
        </div>
        <div className="mt-1 text-center">
          <h1 className="text-base font-semibold tracking-tight text-slate-950">Volunteer Registration</h1>
          <p className="mt-0.5 text-xs text-slate-500">Register to help collect orphan data for Saiban.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {turnstileSiteKey ? (
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          ) : null}
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            <span>Full Name <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Your full name"
              className="min-h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="min-h-3 text-[11px] text-transparent" aria-hidden="true">
              Helper text
            </span>
          </label>

          <label className="grid gap-1 text-xs font-medium text-slate-700">
            <span>Phone Number <span className="text-red-500">*</span></span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(formatPakistanMobile(event.target.value))}
              required
              inputMode="tel"
              placeholder="03XX-XXXXXXX"
              aria-invalid={phoneNumber.length > 0 && !isValidPakistanMobile(phoneNumber)}
              className="min-h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="min-h-3 text-[11px]">
              {phoneNumber.length > 0 && !isValidPakistanMobile(phoneNumber) ? (
                <span className="text-red-600">Use a valid mobile number, for example 03XX-XXXXXXX.</span>
              ) : normalizedPhoneNumber.length >= 4 ? (
                <span className="text-slate-500">
                  Your password will be: <PasswordValueReveal value={derivedPassword} className="font-semibold text-slate-700" />
                </span>
              ) : null}
            </span>
          </label>

          <label className="grid gap-1 text-xs font-medium text-slate-700">
            <span>CNIC <span className="text-xs text-slate-400">(optional)</span></span>
            <input
              type="text"
              value={cnic}
              onChange={(event) => setCnic(formatCnic(event.target.value))}
              inputMode="numeric"
              placeholder="XXXXX-XXXXXXX-X"
              maxLength={15}
              className="min-h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
            <span>Address <span className="text-xs text-slate-400">(optional)</span></span>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={1}
              placeholder="Your residential address"
              className="min-h-9 resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-2">
              <p className="font-medium">{error}</p>
              {error === SECURITY_CHECK_FAILED_MESSAGE ? <SecurityCheckHelp /> : null}
            </div>
          ) : null}

          {turnstileSiteKey ? (
            <div className="flex min-h-[65px] justify-center sm:col-span-2">
              <div
                className="cf-turnstile w-full max-w-[300px] overflow-hidden rounded-lg"
                data-sitekey={turnstileSiteKey}
                data-callback="onTurnstileSuccess"
                data-expired-callback="onTurnstileExpired"
              />
              <TurnstileCallbacks onToken={setCaptchaToken} />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || Boolean(turnstileSiteKey && !captchaToken)}
            className="min-h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>

          <p className="text-center text-xs text-slate-500 sm:col-span-2">
            Already registered?{' '}
            <a href="/signin" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </a>
          </p>
        </form>
        <AuthFooter />
      </div>
    </div>
  );
}

function RegistrationClosed() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-lg items-center px-2 sm:px-0">
      <section
        className="registration-closed-card relative w-full overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-7"
        aria-labelledby="registration-closed-title"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-4">
            <Image src={logo} alt="Saiban" width={180} height={130} className="h-14 w-auto object-contain sm:h-16" priority />
            <Image src={baitussalamLogo} alt="Baitussalam" width={156} height={114} className="h-14 w-auto object-contain sm:h-16" priority />
          </div>

          <div className="flex flex-col items-center pt-6 text-center">
            <div className="relative flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
              <span className="registration-image-glow absolute inset-3 rounded-full bg-amber-200/70 blur-2xl" aria-hidden="true" />
              <Image
                src="/status/registration-paused.webp"
                alt="Registration desk with an hourglass"
                width={512}
                height={512}
                className="registration-paused-image relative h-full w-full rounded-3xl object-cover shadow-sm"
                priority
              />
            </div>

            <h1 id="registration-closed-title" className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]">
              Field worker registration is temporarily closed
            </h1>
            <p dir="rtl" lang="ur" className="mt-2 text-xl font-semibold leading-9 text-slate-900">
              فیلڈ ورکر رجسٹریشن عارضی طور پر بند ہے
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              {FIELD_WORKER_REGISTRATION_CLOSED_MESSAGE}
            </p>
            <p dir="rtl" lang="ur" className="mt-2 max-w-md text-sm leading-8 text-slate-600">
              سائبان کے ساتھ تعاون میں دلچسپی کا شکریہ۔ فی الحال فیلڈ ورکر کی نئی رجسٹریشن قبول نہیں کی جا رہی۔ آپ کے صبر اور تعاون کے لیے ہم تہہ دل سے شکر گزار ہیں۔
            </p>

            <Link
              href="/signin"
              className="group mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            >
              Sign in to your account
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <p className="mt-4 text-xs text-slate-500">
              Need help? Call{' '}
              <a href="tel:+923332552956" className="font-semibold text-slate-700 hover:text-slate-950 hover:underline">
                +92 333 2552956
              </a>
            </p>
          </div>

          <AuthFooter showPhone={false} />
        </div>
      </section>
    </div>
  );
}

function SecurityCheckHelp() {
  return (
    <div className="mt-2 space-y-2 border-t border-red-100 pt-2 text-[11px] leading-4 text-red-800">
      <div>
        <p className="font-semibold">Please try this:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Refresh the page and complete the Cloudflare check again.</li>
          <li>Press Register only once.</li>
          <li>If you waited too long, the security check may have expired.</li>
        </ul>
      </div>
      <div className="text-right" dir="rtl" lang="ur">
        <p className="font-semibold">براہِ کرم یہ کریں:</p>
        <ul className="mt-1 list-disc space-y-0.5 pr-4">
          <li>صفحہ ریفریش کریں اور Cloudflare چیک دوبارہ مکمل کریں۔</li>
          <li>Register بٹن صرف ایک بار دبائیں۔</li>
          <li>زیادہ دیر انتظار کرنے سے سیکیورٹی چیک ختم ہو سکتا ہے۔</li>
        </ul>
      </div>
    </div>
  );
}

function AuthFooter({ showPhone = true }: { showPhone?: boolean }) {
  return (
    <footer className="mt-2 border-t border-slate-200 pt-2 text-center text-[10px] leading-4 text-slate-500">
      <a href="/privacy-policy" className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
        Privacy Policy
      </a>
      <span className="mx-2 text-slate-300">|</span>
      <span>&copy; {new Date().getFullYear()} Saiban. All rights reserved.</span>
      {showPhone ? (
        <>
          <span className="mx-2 text-slate-300">|</span>
          <a href="tel:+923332552956" className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
            +92 333 2552956
          </a>
        </>
      ) : null}
    </footer>
  );
}

function TurnstileCallbacks({ onToken }: { onToken: (token: string) => void }) {
  useEffect(() => {
    (window as any).onTurnstileSuccess = (token: string) => onToken(token);
    (window as any).onTurnstileExpired = () => onToken('');

    return () => {
      delete (window as any).onTurnstileSuccess;
      delete (window as any).onTurnstileExpired;
    };
  }, [onToken]);

  return null;
}

