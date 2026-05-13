'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fieldWorkerProjects } from '@/lib/field-workers';

export type FieldWorkerListItem = {
  id: string;
  fieldWorkerId: string | null;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  project: string | null;
  createdAt: string;
};

type ModalMode = 'add' | 'edit';

type FormState = {
  name: string;
  phoneNumber: string;
  cnic: string;
  address: string;
  project: string;
  password: string;
};

interface FieldWorkerManagerProps {
  initialWorkers: FieldWorkerListItem[];
}

const emptyForm: FormState = {
  name: '',
  phoneNumber: '',
  cnic: '',
  address: '',
  project: fieldWorkerProjects[0],
  password: '',
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function FieldWorkerManager({ initialWorkers }: FieldWorkerManagerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [selectedWorker, setSelectedWorker] = useState<FieldWorkerListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FieldWorkerListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredWorkers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return initialWorkers.filter((worker) => {
      const matchesProject = projectFilter === 'all' || worker.project === projectFilter;
      const searchableText = [
        worker.fieldWorkerId,
        worker.name,
        worker.phoneNumber,
        worker.cnic,
        worker.address,
        worker.project,
      ].filter(Boolean).join(' ').toLowerCase();

      return matchesProject && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [initialWorkers, projectFilter, searchTerm]);

  const projectCounts = useMemo(() => {
    return fieldWorkerProjects.map((project) => ({
      project,
      count: initialWorkers.filter((worker) => worker.project === project).length,
    }));
  }, [initialWorkers]);

  const defaultPassword = useMemo(() => {
    const phoneDigits = digitsOnly(form.phoneNumber);
    return phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';
  }, [form.phoneNumber]);

  const openAddModal = () => {
    setModalMode('add');
    setSelectedWorker(null);
    setForm(emptyForm);
    setMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (worker: FieldWorkerListItem) => {
    setModalMode('edit');
    setSelectedWorker(worker);
    setForm({
      name: worker.name ?? '',
      phoneNumber: worker.phoneNumber ?? '',
      cnic: worker.cnic ?? '',
      address: worker.address ?? '',
      project: worker.project && fieldWorkerProjects.includes(worker.project as (typeof fieldWorkerProjects)[number]) ? worker.project : fieldWorkerProjects[0],
      password: '',
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSelectedWorker(null);
    setMessage(null);
  };

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      name: form.name,
      phoneNumber: form.phoneNumber,
      cnic: form.cnic,
      address: form.address,
      project: form.project,
      password: modalMode === 'add' ? form.password || defaultPassword : form.password,
    };

    const response = await fetch(modalMode === 'add' ? '/api/admin/field-workers' : `/api/admin/field-workers/${selectedWorker?.id}`, {
      method: modalMode === 'add' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to save field worker.');
      return;
    }

    setIsModalOpen(false);
    setMessage(null);
    setForm(emptyForm);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setMessage(null);

    const response = await fetch(`/api/admin/field-workers/${deleteTarget.id}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    setIsDeleting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to delete field worker.');
      setDeleteTarget(null);
      return;
    }

    setDeleteTarget(null);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f1f33]">Field Workers Listed</h2>
            <p className="mt-1 text-sm text-[#5f718a]">{filteredWorkers.length} of {initialWorkers.length} workers shown</p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb] sm:w-auto"
          >
            <Plus size={18} />
            Add Field Worker
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_260px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9bb3]" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, worker ID, phone, CNIC, address"
              className="w-full rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] py-3 pl-10 pr-4 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
            />
          </label>
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          >
            <option value="all">All projects</option>
            {fieldWorkerProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <button
            type="button"
            onClick={() => setProjectFilter('all')}
            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${projectFilter === 'all' ? 'border-[#bfd7ff] bg-[#edf4ff] text-[#2563eb]' : 'border-[#dbe4ef] bg-white text-[#5f718a] hover:bg-[#f6f9fd]'}`}
          >
            All {initialWorkers.length}
          </button>
          {projectCounts.map(({ project, count }) => (
            <button
              key={project}
              type="button"
              onClick={() => setProjectFilter(project)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${projectFilter === project ? 'border-[#bfd7ff] bg-[#edf4ff] text-[#2563eb]' : 'border-[#dbe4ef] bg-white text-[#5f718a] hover:bg-[#f6f9fd]'}`}
            >
              {project} {count}
            </button>
          ))}
        </div>
      </section>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="grid gap-3 p-3 md:hidden">
          {filteredWorkers.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a9bb3]">No field workers match these filters.</p>
          ) : (
            filteredWorkers.map((worker) => (
              <article key={worker.id} className="rounded-xl border border-[#edf2f7] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0f1f33]">{worker.name ?? 'Unnamed worker'}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#8a9bb3]">{worker.fieldWorkerId ?? worker.id}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(worker)}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784]"
                      aria-label={`Edit ${worker.name ?? 'field worker'}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(worker)}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600"
                      aria-label={`Delete ${worker.name ?? 'field worker'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#5f718a]">
                  <p><span className="font-semibold text-[#0f1f33]">Project:</span> {worker.project ?? '-'}</p>
                  <p><span className="font-semibold text-[#0f1f33]">Phone:</span> {worker.phoneNumber ?? '-'}</p>
                  <p><span className="font-semibold text-[#0f1f33]">CNIC:</span> {worker.cnic ?? '-'}</p>
                  <p className="break-words"><span className="font-semibold text-[#0f1f33]">Address:</span> {worker.address ?? '-'}</p>
                  <p className="text-xs text-[#8a9bb3]">Added {formatDate(worker.createdAt)}</p>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm text-[#506784]">
            <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
              <tr>
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#8a9bb3]">No field workers match these filters.</td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#0f1f33]">{worker.name ?? 'Unnamed worker'}</p>
                      <p className="mt-1 text-xs font-semibold text-[#8a9bb3]">{worker.fieldWorkerId ?? worker.id}</p>
                    </td>
                    <td className="px-4 py-4 text-[#506784]">{worker.project ?? '-'}</td>
                    <td className="px-4 py-4">
                      <p>{worker.phoneNumber ?? '-'}</p>
                      <p className="mt-1 text-xs text-[#8a9bb3]">CNIC: {worker.cnic ?? '-'}</p>
                    </td>
                    <td className="max-w-[320px] px-4 py-4 text-[#5f718a]">{worker.address ?? '-'}</td>
                    <td className="px-4 py-4 text-[#8a9bb3]">{formatDate(worker.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(worker)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784] hover:bg-[#f6f9fd]"
                          aria-label={`Edit ${worker.name ?? 'field worker'}`}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(worker)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${worker.name ?? 'field worker'}`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{modalMode === 'add' ? 'Add Field Worker' : 'Edit Field Worker'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === 'add' ? 'Worker ID will be generated automatically.' : selectedWorker?.fieldWorkerId ?? selectedWorker?.id}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    required
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Phone Number</span>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) => updateForm('phoneNumber', event.target.value)}
                    required
                    inputMode="tel"
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>CNIC</span>
                  <input
                    value={form.cnic}
                    onChange={(event) => updateForm('cnic', event.target.value)}
                    required
                    inputMode="numeric"
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Project/منصوبہ</span>
                  <select
                    value={form.project}
                    onChange={(event) => updateForm('project', event.target.value)}
                    required
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {fieldWorkerProjects.map((project) => (
                      <option key={project} value={project}>
                        {project}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm text-slate-700">
                <span>Address/پتہ</span>
                <textarea
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  required
                  rows={3}
                  className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-700">
                <span>{modalMode === 'add' ? 'Password' : 'New Password'}</span>
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => updateForm('password', event.target.value)}
                  minLength={form.password ? 4 : undefined}
                  placeholder={modalMode === 'add' ? `Default: ${defaultPassword || 'last four phone digits'}` : 'Leave blank to keep current password'}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (modalMode === 'add' && !form.password && defaultPassword.length < 4)}
                  className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Add Field Worker' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Delete Field Worker</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Delete {deleteTarget.name ?? 'this field worker'}? This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
