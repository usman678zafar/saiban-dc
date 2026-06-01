'use client';

import { FormEvent, useState } from 'react';
import { signOut } from 'next-auth/react';
import { CheckCircle2 } from 'lucide-react';
import PasswordInput from './password-input';

export default function ForcePasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    const response = await fetch('/api/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to update password.');
      return;
    }

    setSuccessMessage(result?.message ?? 'Password updated successfully. Please sign in again.');
  };

  return (
    <>
      <form onSubmit={submit} className="mt-4 grid gap-2.5">
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          <span>Current password</span>
          <PasswordInput
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            className="min-h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          <span>New password</span>
          <PasswordInput
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            required
            className="min-h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          <span>Confirm new password</span>
          <PasswordInput
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
            className="min-h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {message ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>

      {successMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100 px-4 py-6">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center shadow-xl">
            <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={28} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-semibold text-slate-950">Password changed</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/signin' })}
              className="mt-4 min-h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign in again
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
