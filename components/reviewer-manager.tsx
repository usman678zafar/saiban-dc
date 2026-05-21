'use client';

import { FormEvent, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date-format';
import { formatCnic, formatPakistanMobile } from '@/lib/contact-format';

export type ReviewerListItem = {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  createdAt: string;
};

type FormState = {
  name: string;
  phoneNumber: string;
  cnic: string;
  address: string;
  password: string;
};

const emptyForm: FormState = {
  name: '',
  phoneNumber: '',
  cnic: '',
  address: '',
  password: '',
};

export default function ReviewerManager({ reviewers }: { reviewers: ReviewerListItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selected, setSelected] = useState<ReviewerListItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setIsOpen(true);
  };

  const openEdit = (reviewer: ReviewerListItem) => {
    setSelected(reviewer);
    setForm({
      name: reviewer.name ?? '',
      phoneNumber: formatPakistanMobile(reviewer.phoneNumber ?? ''),
      cnic: formatCnic(reviewer.cnic ?? ''),
      address: reviewer.address ?? '',
      password: '',
    });
    setMessage(null);
    setIsOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload = selected
      ? { name: form.name, cnic: form.cnic, address: form.address, password: form.password }
      : form;
    const response = await fetch(selected ? `/api/admin/reviewers/${selected.id}` : '/api/admin/reviewers', {
      method: selected ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to save reviewer.');
      return;
    }

    setIsOpen(false);
    setForm(emptyForm);
    router.refresh();
  };

  const remove = async (reviewer: ReviewerListItem) => {
    if (!window.confirm(`Delete reviewer ${reviewer.name ?? reviewer.phoneNumber ?? reviewer.email}?`)) return;

    const response = await fetch(`/api/admin/reviewers/${reviewer.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to delete reviewer.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f1f33]">Reviewer Accounts</h2>
            <p className="mt-1 text-sm text-[#5f718a]">Reviewers receive supervisor-approved applications from all departments.</p>
          </div>
          <button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb]">
            <Plus size={18} />
            Add Reviewer
          </button>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <table className="min-w-full text-left text-sm text-[#506784]">
          <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
            <tr>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">CNIC</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviewers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#8a9bb3]">No reviewers yet.</td>
              </tr>
            ) : (
              reviewers.map((reviewer) => (
                <tr key={reviewer.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#0f1f33]">{reviewer.name ?? 'Unnamed reviewer'}</p>
                    <p className="mt-1 text-xs text-[#8a9bb3]">Login: {reviewer.phoneNumber ?? '-'}</p>
                  </td>
                  <td className="px-4 py-4">{reviewer.phoneNumber ?? '-'}</td>
                  <td className="px-4 py-4">{reviewer.cnic ? formatCnic(reviewer.cnic) : '-'}</td>
                  <td className="max-w-[320px] px-4 py-4">{reviewer.address ?? '-'}</td>
                  <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(reviewer.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(reviewer)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784] hover:bg-[#f6f9fd]" aria-label="Edit reviewer">
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => remove(reviewer)} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50" aria-label="Delete reviewer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selected ? 'Edit Reviewer' : 'Add Reviewer'}</h2>
                <p className="mt-1 text-sm text-slate-500">Default password is the last 4 digits of the phone number.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="grid gap-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Name <span className="text-rose-500">*</span></span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Phone Number <span className="text-rose-500">*</span></span>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) => setForm({ ...form, phoneNumber: formatPakistanMobile(event.target.value) })}
                    required
                    disabled={Boolean(selected)}
                    inputMode="tel"
                    placeholder="03332101476"
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-500"
                  />
                  {selected ? <span className="text-xs text-slate-500">Phone number cannot be changed after registration.</span> : null}
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>CNIC <span className="text-xs text-slate-400">(optional)</span></span>
                  <input value={form.cnic} onChange={(event) => setForm({ ...form, cnic: formatCnic(event.target.value) })} inputMode="numeric" placeholder="42101-0536155-7" maxLength={15} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Address <span className="text-xs text-slate-400">(optional)</span></span>
                  <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Reviewer login uses this phone number. Password: last 4 digits of the phone number.
              </div>
              {selected ? (
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>New Password <span className="text-xs text-slate-400">(optional)</span></span>
                  <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={form.password ? 4 : undefined} placeholder="Leave blank to keep current password" className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              ) : null}

              {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : 'Save Reviewer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
