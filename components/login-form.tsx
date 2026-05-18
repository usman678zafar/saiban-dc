'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNavigationLoading } from './navigation-loading';

interface LoginFormProps {
  title?: string;
  description?: string;
  defaultRedirect?: string;
  loginRole?: 'admin' | 'field_worker';
  compact?: boolean;
}

export default function LoginForm({
  title = 'Sign In',
  description = 'Use your Saiban credentials to access the temporary data collector.',
  defaultRedirect = '/dashboard',
  loginRole,
  compact = false,
}: LoginFormProps) {
  const router = useRouter();
  const { startLoading, stopLoading } = useNavigationLoading();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    startLoading();
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: identifier,
        password,
        loginRole,
      });

      if (result?.error) {
        setError(loginRole === 'admin' ? 'Invalid admin credentials.' : loginRole === 'field_worker' ? 'Invalid volunteer credentials.' : 'Invalid credentials.');
        stopLoading();
        return;
      }

      const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
      router.push(callbackUrl ?? defaultRedirect);
      router.refresh();
    } catch {
      setError('Unable to sign in. Please try again.');
      stopLoading();
    } finally {
      setIsSubmitting(false);
    }
  };
  const identifierLabel = loginRole === 'field_worker' ? 'Phone Number or CNIC' : loginRole === 'admin' ? 'Email or Username' : 'Email';
  const identifierType = loginRole ? 'text' : 'email';

  return (
    <div className={compact ? 'mt-4' : 'mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm'}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {!compact && description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>{identifierLabel}</span>
          <input
            type={identifierType}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
