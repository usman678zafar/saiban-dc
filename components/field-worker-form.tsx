'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fieldWorkerProjects } from '@/lib/field-workers';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export default function FieldWorkerForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [project, setProject] = useState<string>(fieldWorkerProjects[0]);
  const [customPassword, setCustomPassword] = useState('');
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoPassword = useMemo(() => {
    const phoneDigits = digitsOnly(phoneNumber);
    return phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';
  }, [phoneNumber]);
  const password = useCustomPassword ? customPassword : autoPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/admin/field-workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phoneNumber, cnic, address, project, password }),
    });

    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to create field worker.');
      return;
    }

    setName('');
    setPhoneNumber('');
    setCnic('');
    setAddress('');
    setProject(fieldWorkerProjects[0]);
    setCustomPassword('');
    setUseCustomPassword(false);
    setMessage(`Field worker created successfully. ID: ${result.fieldWorkerId}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
      <label className="grid gap-2 text-sm text-slate-700">
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>Phone Number</span>
        <input
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          required
          inputMode="tel"
          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>CNIC</span>
        <input
          value={cnic}
          onChange={(event) => setCnic(event.target.value)}
          required
          inputMode="numeric"
          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>Address/پتہ</span>
        <textarea
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
          rows={3}
          className="resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="grid gap-2 text-sm text-slate-700">
        <span>Department/شعبہ</span>
        <select
          value={project}
          onChange={(event) => setProject(event.target.value)}
          required
          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {fieldWorkerProjects.map((projectOption) => (
            <option key={projectOption} value={projectOption}>
              {projectOption}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <span className="block font-semibold text-slate-900">Field Worker ID</span>
        <span className="mt-1 block text-slate-600">The system will generate this automatically after saving.</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={useCustomPassword}
            onChange={(event) => setUseCustomPassword(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold text-slate-900">Use custom password</span>
            <span className="block text-slate-600">Default password is the last four digits of the phone number.</span>
          </span>
        </label>
        {useCustomPassword ? (
          <input
            type="text"
            value={customPassword}
            onChange={(event) => setCustomPassword(event.target.value)}
            required
            minLength={4}
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <p className="mt-4 text-sm text-slate-700">Password: <span className="font-semibold text-slate-900">{autoPassword || 'Enter phone number'}</span></p>
        )}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting || password.length < 4}
        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Creating...' : 'Add Field Worker'}
      </button>
    </form>
  );
}





