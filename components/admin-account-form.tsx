'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { signOut } from 'next-auth/react';

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyForm: FormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function AdminAccountForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    const response = await fetch('/api/admin/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to update password.');
      return;
    }

    setForm(emptyForm);
    setIsSuccess(true);
    setMessage(result?.message ?? 'Password updated successfully.');
    await signOut({ callbackUrl: '/signin' });
  };

  return (
    <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[#edf4ff] text-[#2563eb]">
          <KeyRound size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#0f1f33]">Password</h2>
          <p className="mt-1 text-sm text-[#5f718a]">Update the password used to sign in to this admin portal.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid max-w-xl gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          <span>Current Password <span className="text-rose-500">*</span></span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            required
            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span>New Password <span className="text-rose-500">*</span></span>
          <input
            type="password"
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span>Confirm New Password <span className="text-rose-500">*</span></span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            required
            minLength={8}
            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {message ? (
          <p className={`rounded-lg border px-4 py-3 text-sm ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {message}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb] disabled:opacity-60"
          >
            <Save size={17} aria-hidden="true" />
            {isSubmitting ? 'Saving...' : 'Save Password'}
          </button>
        </div>
      </form>
    </section>
  );
}
