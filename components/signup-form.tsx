'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import logo from '@/assests/logo.png';
import baitussalamLogo from '@/assests/baitussalam.webp';
import { useNavigationLoading } from './navigation-loading';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function normalizePakistanMobile(value: string) {
  const digits = digitsOnly(value);
  if (digits.startsWith('0092') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits;
}

function isValidPakistanMobile(value: string) {
  return /^03\d{9}$/.test(normalizePakistanMobile(value));
}

function formatCnic(value: string) {
  const digits = digitsOnly(value).slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

type SuccessInfo = {
  fieldWorkerId: string;
  name: string;
  password: string;
};

export default function SignupForm() {
  const router = useRouter();
  const { startLoading } = useNavigationLoading();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const normalizedPhoneNumber = normalizePakistanMobile(phoneNumber);
  const derivedPassword = normalizedPhoneNumber.slice(-4);

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
      body: JSON.stringify({ name, phoneNumber: normalizedPhoneNumber, cnic, address }),
    });

    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(result?.message ?? 'Registration failed. Please try again.');
      return;
    }

    setSuccess({
      fieldWorkerId: result.fieldWorkerId,
      name: result.name,
      password: derivedPassword,
    });
  };

  if (success) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-sm items-center px-2 sm:px-0">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-h-20 items-center justify-between gap-6">
            <Image src={logo} alt="Saiban" width={150} height={110} className="h-16 w-auto object-contain sm:h-20" priority />
            <Image src={baitussalamLogo} alt="Baitussalam" width={132} height={96} className="h-16 w-auto object-contain sm:h-20" priority />
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Registration Successful</h2>
            <p className="mt-1 text-sm text-slate-500">Welcome, {success.name}!</p>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">Your login details</p>
            <div className="mt-3 space-y-2 text-slate-700">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Worker ID</span>
                <span className="font-mono font-semibold text-slate-900">{success.fieldWorkerId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Password</span>
                <span className="font-mono font-semibold text-slate-900">{success.password}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Your password is the last 4 digits of your phone number. Save these details - you will need them to sign in.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              startLoading();
              router.push('/signin');
            }}
            className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Sign In
          </button>
          <AuthFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-sm items-center px-2 sm:px-0">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex min-h-20 items-center justify-between gap-6">
          <Image src={logo} alt="Saiban" width={150} height={110} className="h-16 w-auto object-contain sm:h-20" priority />
          <Image src={baitussalamLogo} alt="Baitussalam" width={132} height={96} className="h-16 w-auto object-contain sm:h-20" priority />
        </div>
        <div className="mt-3 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-slate-950">Volunteer Registration</h1>
          <p className="mt-0.5 text-xs text-slate-500">Register to help collect orphan data for Saiban.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>Full Name <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Your full name"
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>Phone Number <span className="text-red-500">*</span></span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
              inputMode="tel"
              placeholder="03XX-XXXXXXX"
              aria-invalid={phoneNumber.length > 0 && !isValidPakistanMobile(phoneNumber)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {phoneNumber.length > 0 && !isValidPakistanMobile(phoneNumber) ? (
              <span className="text-xs text-red-600">Use a valid mobile number, for example 03XX-XXXXXXX.</span>
            ) : normalizedPhoneNumber.length >= 4 ? (
              <span className="text-xs text-slate-500">
                Your password will be: <span className="font-semibold text-slate-700">{derivedPassword}</span>
              </span>
            ) : null}
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>CNIC <span className="text-xs text-slate-400">(optional)</span></span>
            <input
              type="text"
              value={cnic}
              onChange={(event) => setCnic(formatCnic(event.target.value))}
              inputMode="numeric"
              placeholder="XXXXX-XXXXXXX-X"
              maxLength={15}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>Address <span className="text-xs text-slate-400">(optional)</span></span>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              placeholder="Your residential address"
              className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>

          <p className="text-center text-xs text-slate-500">
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

function AuthFooter() {
  return (
    <footer className="mt-4 border-t border-slate-200 pt-3 text-center text-[11px] leading-5 text-slate-500">
      <a href="/privacy-policy" className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
        Privacy Policy
      </a>
      <span className="mx-2 text-slate-300">|</span>
      <span>&copy; {new Date().getFullYear()} Saiban. All rights reserved.</span>
    </footer>
  );
}
