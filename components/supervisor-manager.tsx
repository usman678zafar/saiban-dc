'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { fieldWorkerProjects } from '@/lib/field-workers';

export type SupervisorListItem = {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  project: string | null;
  createdAt: string;
};

type FormState = {
  name: string;
  email: string;
  phoneNumber: string;
  project: string;
  password: string;
};

const emptyForm: FormState = {
  name: '',
  email: '',
  phoneNumber: '',
  project: fieldWorkerProjects[0],
  password: '',
};

export default function SupervisorManager({ supervisors }: { supervisors: SupervisorListItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selected, setSelected] = useState<SupervisorListItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setIsOpen(true);
  };

  const openEdit = (supervisor: SupervisorListItem) => {
    setSelected(supervisor);
    setForm({
      name: supervisor.name ?? '',
      email: supervisor.email,
      phoneNumber: supervisor.phoneNumber ?? '',
      project: fieldWorkerProjects.includes(supervisor.project as any) ? supervisor.project! : fieldWorkerProjects[0],
      password: '',
    });
    setMessage(null);
    setIsOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch(selected ? `/api/admin/supervisors/${selected.id}` : '/api/admin/supervisors', {
      method: selected ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to save supervisor.');
      return;
    }

    setIsOpen(false);
    setForm(emptyForm);
    router.refresh();
  };

  const remove = async (supervisor: SupervisorListItem) => {
    if (!window.confirm(`Delete supervisor ${supervisor.name ?? supervisor.email}?`)) return;

    const response = await fetch(`/api/admin/supervisors/${supervisor.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to delete supervisor.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f1f33]">Supervisor Accounts</h2>
            <p className="mt-1 text-sm text-[#5f718a]">Assign each supervisor to the project they review.</p>
          </div>
          <button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb]">
            <Plus size={18} />
            Add Supervisor
          </button>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <table className="min-w-full text-left text-sm text-[#506784]">
          <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
            <tr>
              <th className="px-4 py-3">Supervisor</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#8a9bb3]">No supervisors yet.</td>
              </tr>
            ) : (
              supervisors.map((supervisor) => (
                <tr key={supervisor.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#0f1f33]">{supervisor.name ?? 'Unnamed supervisor'}</p>
                    <p className="mt-1 text-xs text-[#8a9bb3]">{supervisor.email}</p>
                  </td>
                  <td className="px-4 py-4">{supervisor.project ?? '-'}</td>
                  <td className="px-4 py-4">{supervisor.phoneNumber ?? '-'}</td>
                  <td className="px-4 py-4 text-[#8a9bb3]">{new Date(supervisor.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(supervisor)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784] hover:bg-[#f6f9fd]" aria-label="Edit supervisor">
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => remove(supervisor)} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50" aria-label="Delete supervisor">
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
                <h2 className="text-lg font-semibold text-slate-900">{selected ? 'Edit Supervisor' : 'Add Supervisor'}</h2>
                <p className="mt-1 text-sm text-slate-500">Supervisors can only review applications for their assigned project.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="grid gap-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Name</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Phone</span>
                  <input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Project</span>
                  <select value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} required className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    {fieldWorkerProjects.map((project) => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm text-slate-700">
                <span>{selected ? 'New Password' : 'Password'}</span>
                <input type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!selected} placeholder={selected ? 'Leave blank to keep current password' : ''} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>

              {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : 'Save Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
