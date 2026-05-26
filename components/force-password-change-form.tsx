'use client';

import { FormEvent, useState } from 'react';
import { signOut } from 'next-auth/react';

export default function ForcePasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setMessage(result?.message ?? 'Password updated successfully. Please sign in again.');
    await signOut({ callbackUrl: '/signin' });
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3">
      <label className="grid gap-1.5 text-sm text-slate-700">
        <span>Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-700">
        <span>New password</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          required
          className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-700">
        <span>Confirm new password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
          className="min-h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      {message ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}
