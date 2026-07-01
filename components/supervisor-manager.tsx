'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { formatDate } from '@/lib/date-format';
import { formatCnic, formatPakistanMobile } from '@/lib/contact-format';
import { AutofillTrap, fieldNoAutofillProps, formNoAutofillProps, passwordNoAutofillProps } from './autofill-guard';
import PasswordInput from './password-input';

export type SupervisorListItem = {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  project: string | null;
  projects: string[];
  canCreateApplications: boolean;
  canManageFieldWorkers: boolean;
  createdAt: string;
};

type FormState = {
  name: string;
  phoneNumber: string;
  cnic: string;
  address: string;
  projects: string[];
  password: string;
  canCreateApplications: boolean;
  canManageFieldWorkers: boolean;
};

const buildEmptyForm = (projects: string[]): FormState => ({
  name: '',
  phoneNumber: '',
  cnic: '',
  address: '',
  projects: projects[0] ? [projects[0]] : [],
  password: '',
  canCreateApplications: false,
  canManageFieldWorkers: false,
});

export default function SupervisorManager({ supervisors, projects }: { supervisors: SupervisorListItem[]; projects: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildEmptyForm(projects));
  const [selected, setSelected] = useState<SupervisorListItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setSelected(null);
    setForm(buildEmptyForm(projects));
    setMessage(null);
    setIsOpen(true);
  };

  const openEdit = (supervisor: SupervisorListItem) => {
    setSelected(supervisor);
    setForm({
      name: supervisor.name ?? '',
      phoneNumber: formatPakistanMobile(supervisor.phoneNumber ?? ''),
      cnic: formatCnic(supervisor.cnic ?? ''),
      address: supervisor.address ?? '',
      projects: supervisor.projects.length
        ? supervisor.projects.filter((project) => projects.includes(project))
        : supervisor.project && projects.includes(supervisor.project) ? [supervisor.project] : projects[0] ? [projects[0]] : [],
      password: '',
      canCreateApplications: supervisor.canCreateApplications,
      canManageFieldWorkers: supervisor.canManageFieldWorkers,
    });
    setMessage(null);
    setIsOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload = selected
      ? { name: form.name, cnic: form.cnic, address: form.address, projects: form.projects, password: form.password, canCreateApplications: form.canCreateApplications, canManageFieldWorkers: form.canManageFieldWorkers }
      : form;
    const response = await fetch(selected ? `/api/admin/supervisors/${selected.id}` : '/api/admin/supervisors', {
      method: selected ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to save supervisor.');
      return;
    }

    setIsOpen(false);
    setForm(buildEmptyForm(projects));
    router.refresh();
  };

  const remove = async (supervisor: SupervisorListItem) => {
    if (!window.confirm(`Delete supervisor ${supervisor.name ?? supervisor.phoneNumber ?? supervisor.email}?`)) return;

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
            <p className="mt-1 text-sm text-[#5f718a]">Assign each supervisor to the departments they review.</p>
          </div>
          <button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb]">
            <Plus size={18} />
            Add Supervisor
          </button>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="overflow-x-auto overscroll-x-contain rounded-xl border border-[#dbe4ef] bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm text-[#506784]">
          <thead className="bg-blue-600 text-xs uppercase tracking-[0.12em] text-white">
            <tr>
              <th className="px-4 py-4">Supervisor</th>
              <th className="px-4 py-4">Department</th>
              <th className="px-4 py-4">Create Access</th>
              <th className="px-4 py-4">Worker Access</th>
              <th className="px-4 py-4">Phone</th>
              <th className="px-4 py-4">Added</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#8a9bb3]">No supervisors yet.</td>
              </tr>
            ) : (
              supervisors.map((supervisor) => (
                <tr key={supervisor.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#0f1f33]">{supervisor.name ?? 'Unnamed supervisor'}</p>
                    <p className="mt-1 text-xs text-[#8a9bb3]">Login: {supervisor.phoneNumber ?? '-'}</p>
                  </td>
                  <td className="px-4 py-4">{supervisor.projects.length ? supervisor.projects.join(', ') : supervisor.project ?? '-'}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${supervisor.canCreateApplications ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {supervisor.canCreateApplications ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${supervisor.canManageFieldWorkers ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {supervisor.canManageFieldWorkers ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-4">{supervisor.phoneNumber ?? '-'}</td>
                  <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(supervisor.createdAt)}</td>
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
          <div className="flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selected ? 'Edit Supervisor' : 'Add Supervisor'}</h2>
                <p className="mt-1 text-sm text-slate-500">Default password is the last 4 digits of the phone number.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form {...formNoAutofillProps} onSubmit={submit} className="relative flex min-h-0 flex-1 flex-col">
              <AutofillTrap />
              <div className="grid gap-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Name <span className="text-rose-500">*</span></span>
                  <input {...fieldNoAutofillProps} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Phone Number <span className="text-rose-500">*</span></span>
                  <input
                    {...fieldNoAutofillProps}
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
              <fieldset className="grid gap-2 text-sm text-slate-700">
                <legend>Departments <span className="text-rose-500">*</span></legend>
                <div className="grid gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 sm:grid-cols-3">
                  {projects.map((project) => (
                    <label key={project} className="flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm leading-5 shadow-sm">
                      <input
                        type="checkbox"
                        checked={form.projects.includes(project)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          projects: current.projects.includes(project)
                            ? current.projects.filter((item) => item !== project)
                            : [...current.projects, project],
                        }))}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="min-w-0 break-words">{project}</span>
                    </label>
                  ))}
                </div>
                {form.projects.length === 0 ? <span className="text-xs text-rose-600">Select at least one department.</span> : null}
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>CNIC <span className="text-xs text-slate-400">(optional)</span></span>
                  <input {...fieldNoAutofillProps} value={form.cnic} onChange={(event) => setForm({ ...form, cnic: formatCnic(event.target.value) })} inputMode="numeric" placeholder="42101-0536155-7" maxLength={15} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Address <span className="text-xs text-slate-400">(optional)</span></span>
                  <textarea {...fieldNoAutofillProps} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} rows={3} className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.canCreateApplications}
                  onChange={(event) => setForm({ ...form, canCreateApplications: event.target.checked })}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span>
                  <span className="block font-semibold text-slate-900">Can create applications</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Allows this supervisor to create and submit their own application records.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.canManageFieldWorkers}
                  onChange={(event) => setForm({ ...form, canManageFieldWorkers: event.target.checked })}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span>
                  <span className="block font-semibold text-slate-900">Can manage field workers</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Allows this supervisor to add and manage field workers assigned to their own departments.</span>
                </span>
              </label>
              {selected ? (
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>New Password <span className="text-xs text-slate-400">(optional)</span></span>
                  <PasswordInput {...passwordNoAutofillProps} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={form.password ? 4 : undefined} placeholder="Leave blank to keep current password" className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              ) : null}
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Supervisor login uses this phone number. Password: last 4 digits of the phone number.
              </div>

              {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || form.projects.length === 0} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
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






