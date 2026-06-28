'use client';

import { FormEvent, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date-format';
import { AutofillTrap, fieldNoAutofillProps, formNoAutofillProps, passwordNoAutofillProps } from './autofill-guard';
import PasswordInput from './password-input';

export type AdminListItem = {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'viewer';
  createdAt: string;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'viewer';
};

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'admin',
};

export default function AdminManager({ admins }: { admins: AdminListItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selected, setSelected] = useState<AdminListItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setIsOpen(true);
  };

  const openEdit = (admin: AdminListItem) => {
    setSelected(admin);
    setForm({ name: admin.name ?? '', email: admin.email, password: '', role: admin.role });
    setMessage(null);
    setIsOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload = selected ? { name: form.name, password: form.password } : form;
    const response = await fetch(selected ? `/api/admin/admins/${selected.id}` : '/api/admin/admins', {
      method: selected ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to save account.');
      return;
    }

    setIsOpen(false);
    setForm(emptyForm);
    router.refresh();
  };

  const remove = async (admin: AdminListItem) => {
    if (!window.confirm(`Delete ${admin.role === 'viewer' ? 'viewer' : 'admin'} ${admin.name ?? admin.email}?`)) return;

    const response = await fetch(`/api/admin/admins/${admin.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to delete account.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f1f33]">Admin & Viewer Accounts</h2>
            <p className="mt-1 text-sm text-[#5f718a]">Admins can work in the admin portal. Viewers can only see applications, KPIs, and download application reviews.</p>
          </div>
          <button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb]">
            <Plus size={18} />
            Add Account
          </button>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <table className="min-w-full text-left text-sm text-[#506784]">
          <thead className="bg-blue-600 text-xs uppercase tracking-[0.12em] text-white">
            <tr>
              <th className="px-4 py-4">Admin</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Added</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#8a9bb3]">No accounts yet.</td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                  <td className="px-4 py-4 font-semibold text-[#0f1f33]">{admin.name ?? `Unnamed ${admin.role}`}</td>
                  <td className="px-4 py-4">{admin.email}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${admin.role === 'viewer' ? 'bg-sky-50 text-sky-700' : 'bg-blue-50 text-blue-700'}`}>
                      {admin.role === 'viewer' ? 'Viewer' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(admin.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(admin)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784] hover:bg-[#f6f9fd]" aria-label="Edit account">
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => remove(admin)} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50" aria-label="Delete account">
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
                <h2 className="text-lg font-semibold text-slate-900">{selected ? 'Edit Account' : 'Add Account'}</h2>
                <p className="mt-1 text-sm text-slate-500">Admin and viewer accounts are managed only by super admins.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form {...formNoAutofillProps} onSubmit={submit} className="relative grid gap-4 px-6 py-5">
              <AutofillTrap />
              <label className="grid gap-2 text-sm text-slate-700">
                <span>Name <span className="text-rose-500">*</span></span>
                <input {...fieldNoAutofillProps} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span>Email <span className="text-rose-500">*</span></span>
                <input {...fieldNoAutofillProps} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={Boolean(selected)} type="email" className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-500" />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span>Role <span className="text-rose-500">*</span></span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value === 'viewer' ? 'viewer' : 'admin' })}
                  disabled={Boolean(selected)}
                  required
                  className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span>{selected ? 'New Password' : 'Password'} {selected ? <span className="text-xs text-slate-400">(optional)</span> : <span className="text-rose-500">*</span>}</span>
                <PasswordInput {...passwordNoAutofillProps} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!selected} minLength={form.password || !selected ? 8 : undefined} placeholder={selected ? 'Leave blank to keep current password' : 'At least 8 characters'} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>

              {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
