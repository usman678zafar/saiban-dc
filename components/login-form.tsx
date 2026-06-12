'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNavigationLoading } from './navigation-loading';
import PasswordInput from './password-input';

interface LoginFormProps {
  title?: string;
  description?: string;
  defaultRedirect?: string;
  loginRole?: 'admin' | 'reviewer' | 'supervisor' | 'field_worker' | 'viewer';
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
        setError(loginRole === 'admin' ? 'Invalid admin credentials.' : loginRole === 'reviewer' ? 'Invalid reviewer credentials.' : loginRole === 'supervisor' ? 'Invalid supervisor credentials.' : loginRole === 'field_worker' ? 'Invalid volunteer credentials.' : loginRole === 'viewer' ? 'Invalid viewer credentials.' : 'Invalid credentials.');
        stopLoading();
        return;
      }

      const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
      router.push(loginRole === 'supervisor' ? defaultRedirect : callbackUrl ?? defaultRedirect);
      router.refresh();
    } catch {
      setError('Unable to sign in. Please try again.');
      stopLoading();
    } finally {
      setIsSubmitting(false);
    }
  };
  const identifierLabel = loginRole === 'field_worker' ? 'Phone Number or CNIC' : loginRole === 'supervisor' || loginRole === 'reviewer' ? 'Phone Number' : loginRole === 'admin' ? 'Email or Username' : 'Email';
  const identifierType = loginRole ? 'text' : 'email';

  return (
    <div className={compact ? 'mt-3' : 'mx-auto w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-sm'}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {!compact && description ? <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p> : null}
      <form onSubmit={handleSubmit} className="mt-2.5 space-y-2.5">
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          <span>{identifierLabel}</span>
          <input
            type={identifierType}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            className="min-h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          <span>Password</span>
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="min-h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

