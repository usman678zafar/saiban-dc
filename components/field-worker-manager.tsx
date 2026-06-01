'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date-format';
import { formatCnic, formatPakistanMobile } from '@/lib/contact-format';
import { useNavigationLoading } from './navigation-loading';
import PasswordInput from './password-input';

export type FieldWorkerListItem = {
  id: string;
  fieldWorkerId: string | null;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  reference: string | null;
  project: string | null;
  supervisorId: string | null;
  supervisor: {
    id: string;
    name: string | null;
    phoneNumber: string | null;
    project: string | null;
    supervisorDepartments?: Array<{ project: string }>;
  } | null;
  selfRegistered: boolean;
  createdAt: string;
};

export type FieldWorkerSupervisorOption = {
  id: string;
  name: string | null;
  phoneNumber: string | null;
  project: string | null;
  supervisorDepartments?: Array<{ project: string }>;
};

type ModalMode = 'add' | 'edit';
type SourceFilter = 'all' | 'admin' | 'self';

type FormState = {
  name: string;
  phoneNumber: string;
  cnic: string;
  address: string;
  reference: string;
  project: string;
  supervisorId: string;
  password: string;
};

interface FieldWorkerManagerProps {
  initialWorkers: FieldWorkerListItem[];
  supervisors: FieldWorkerSupervisorOption[];
  projects: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    project: string;
    supervisor: string;
    source: SourceFilter;
  };
  counts: {
    totalAll: number;
    admin: number;
    self: number;
    projects: Array<{ project: string; count: number }>;
  };
}

const emptyForm: FormState = {
  name: '',
  phoneNumber: '',
  cnic: '',
  address: '',
  reference: '',
  project: '',
  supervisorId: '',
  password: '',
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export default function FieldWorkerManager({ initialWorkers, supervisors, projects, pagination, filters, counts }: FieldWorkerManagerProps) {
  const router = useRouter();
  const { startLoading } = useNavigationLoading();
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [selectedWorker, setSelectedWorker] = useState<FieldWorkerListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FieldWorkerListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditingSelfRegistered = modalMode === 'edit' && selectedWorker?.selfRegistered === true;
  const supervisorProjects = (supervisor: FieldWorkerSupervisorOption) => (
    supervisor.supervisorDepartments?.length
      ? supervisor.supervisorDepartments.map((department) => department.project)
      : supervisor.project ? [supervisor.project] : []
  );
  const availableSupervisors = useMemo(
    () => supervisors.filter((supervisor) => supervisorProjects(supervisor).includes(form.project)),
    [form.project, supervisors],
  );

  const buildHref = (updates: Partial<{ page: number; q: string; project: string; supervisor: string; source: SourceFilter }>) => {
    const params = new URLSearchParams();
    const nextQ = updates.q ?? filters.search;
    const nextproject = updates.project ?? filters.project;
    const nextSupervisor = updates.supervisor ?? filters.supervisor;
    const nextSource = updates.source ?? filters.source;
    const nextPage = updates.page ?? pagination.page;

    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextproject && nextproject !== 'all') params.set('project', nextproject);
    if (nextSupervisor && nextSupervisor !== 'all') params.set('supervisor', nextSupervisor);
    if (nextSource && nextSource !== 'all') params.set('source', nextSource);
    if (nextPage > 1) params.set('page', String(nextPage));

    const query = params.toString();
    return query ? `/admin/field-workers?${query}` : '/admin/field-workers';
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateTo(buildHref({ q: searchTerm, page: 1 }));
  };

  const navigateTo = (href: string) => {
    const nextUrl = new URL(href, window.location.href);
    if (nextUrl.pathname !== window.location.pathname || nextUrl.search !== window.location.search) {
      startLoading();
    }
    router.push(href);
  };

  const defaultPassword = useMemo(() => {
    const phoneDigits = digitsOnly(form.phoneNumber);
    return phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';
  }, [form.phoneNumber]);

  const openAddModal = () => {
    setModalMode('add');
    setSelectedWorker(null);
    const firstproject = projects[0] ?? '';
    const firstSupervisor = supervisors.find((supervisor) => supervisorProjects(supervisor).includes(firstproject));
    setForm({ ...emptyForm, project: firstproject, supervisorId: firstSupervisor?.id ?? '' });
    setMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (worker: FieldWorkerListItem) => {
    setModalMode('edit');
    setSelectedWorker(worker);
    setForm({
      name: worker.name ?? '',
      phoneNumber: formatPakistanMobile(worker.phoneNumber ?? ''),
      cnic: formatCnic(worker.cnic ?? ''),
      address: worker.address ?? '',
      reference: worker.reference ?? '',
      project: worker.project && projects.includes(worker.project) ? worker.project : projects[0] ?? '',
      supervisorId: worker.supervisorId ?? '',
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
    setForm((current) => {
      if (key === 'phoneNumber') return { ...current, phoneNumber: formatPakistanMobile(value) };
      if (key === 'cnic') return { ...current, cnic: formatCnic(value) };
      if (key !== 'project') return { ...current, [key]: value };
      const firstSupervisor = supervisors.find((supervisor) => supervisorProjects(supervisor).includes(value));
      return { ...current, project: value, supervisorId: firstSupervisor?.id ?? '' };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload: Record<string, string> = {
      name: form.name,
      cnic: form.cnic,
      address: form.address,
      reference: form.reference,
      project: form.project,
      supervisorId: form.supervisorId,
      password: modalMode === 'add' ? form.password || defaultPassword : form.password,
    };
    if (modalMode === 'add') {
      payload.phoneNumber = form.phoneNumber;
    }

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
            <p className="mt-1 text-sm text-[#5f718a]">
              {pagination.total === 0
                ? 'No workers found'
                : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} workers`}
            </p>
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

        <form onSubmit={applySearch} className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_220px_260px]">
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9bb3]" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, worker ID, phone, CNIC, supervisor, reference, address"
              className="w-full rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] py-3 pl-10 pr-4 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-[#0f1f33] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1f2f46]"
          >
            Search
          </button>
          <select
            value={filters.project}
            onChange={(event) => navigateTo(buildHref({ project: event.target.value, supervisor: 'all', page: 1 }))}
            className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          >
            <option value="all">All departments</option>
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <select
            value={filters.supervisor}
            onChange={(event) => navigateTo(buildHref({ supervisor: event.target.value, page: 1 }))}
            className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          >
            <option value="all">All supervisors</option>
            {supervisors
              .filter((supervisor) => filters.project === 'all' || supervisorProjects(supervisor).includes(filters.project))
              .map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.name ?? supervisor.phoneNumber ?? 'Unnamed supervisor'}{supervisorProjects(supervisor).length ? ` (${supervisorProjects(supervisor).join(', ')})` : ''}
                </option>
              ))}
          </select>
        </form>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <button
            type="button"
            onClick={() => navigateTo(buildHref({ source: 'all', page: 1 }))}
            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${filters.source === 'all' ? 'border-[#bfd7ff] bg-[#edf4ff] text-[#2563eb]' : 'border-[#dbe4ef] bg-white text-[#5f718a] hover:bg-[#f6f9fd]'}`}
          >
            All {counts.totalAll}
          </button>
          <button
            type="button"
            onClick={() => navigateTo(buildHref({ source: 'admin', page: 1 }))}
            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${filters.source === 'admin' ? 'border-[#bfd7ff] bg-[#edf4ff] text-[#2563eb]' : 'border-[#dbe4ef] bg-white text-[#5f718a] hover:bg-[#f6f9fd]'}`}
          >
            Admin Added {counts.admin}
          </button>
          <button
            type="button"
            onClick={() => navigateTo(buildHref({ source: 'self', page: 1 }))}
            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${filters.source === 'self' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-[#dbe4ef] bg-white text-[#5f718a] hover:bg-[#f6f9fd]'}`}
          >
            Self Registered {counts.self}
          </button>
          <span className="mx-1 my-auto h-4 w-px bg-[#dbe4ef]" />
          {counts.projects
            .filter(({ count }) => count > 0)
            .map(({ project, count }) => (
              <button
                key={project}
                type="button"
                onClick={() => navigateTo(buildHref({ project, supervisor: 'all', page: 1 }))}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${filters.project === project ? 'border-[#bfd7ff] bg-[#edf4ff] text-[#2563eb]' : 'border-[#dbe4ef] bg-white text-[#5f718a] hover:bg-[#f6f9fd]'}`}
              >
                {project} {count}
              </button>
            ))}
        </div>
      </section>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="grid gap-3 p-3 md:hidden">
          {initialWorkers.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a9bb3]">No field workers match these filters.</p>
          ) : (
            initialWorkers.map((worker) => (
              <article key={worker.id} className="rounded-xl border border-[#edf2f7] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0f1f33]">{worker.name ?? 'Unnamed worker'}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#8a9bb3]">{worker.fieldWorkerId ?? worker.id}</p>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${worker.selfRegistered ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {worker.selfRegistered ? 'Self Registered' : 'Admin Added'}
                    </span>
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
                  <p><span className="font-semibold text-[#0f1f33]">Department:</span> {worker.project ?? '-'}</p>
                  <p><span className="font-semibold text-[#0f1f33]">Supervisor:</span> {worker.supervisor?.name ?? worker.supervisor?.phoneNumber ?? '-'}</p>
                  <p><span className="font-semibold text-[#0f1f33]">Phone:</span> {worker.phoneNumber ?? '-'}</p>
                  <p><span className="font-semibold text-[#0f1f33]">CNIC:</span> {worker.cnic ? formatCnic(worker.cnic) : '-'}</p>
                  <p><span className="font-semibold text-[#0f1f33]">Reference:</span> {worker.reference ?? '-'}</p>
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
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Supervisor</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialWorkers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#8a9bb3]">No field workers match these filters.</td>
                </tr>
              ) : (
                initialWorkers.map((worker) => (
                  <tr key={worker.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#0f1f33]">{worker.name ?? 'Unnamed worker'}</p>
                      <p className="mt-1 text-xs font-semibold text-[#8a9bb3]">{worker.fieldWorkerId ?? worker.id}</p>
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${worker.selfRegistered ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {worker.selfRegistered ? 'Self Registered' : 'Admin Added'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#506784]">{worker.project ?? '-'}</td>
                    <td className="px-4 py-4 text-[#506784]">
                      <p>{worker.supervisor?.name ?? '-'}</p>
                      <p className="mt-1 text-xs text-[#8a9bb3]">{worker.supervisor?.phoneNumber ?? ''}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{worker.phoneNumber ?? '-'}</p>
                      <p className="mt-1 text-xs text-[#8a9bb3]">CNIC: {worker.cnic ? formatCnic(worker.cnic) : '-'}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 text-[#5f718a]">{worker.reference ?? '-'}</td>
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

      <PaginationControls pagination={pagination} buildHref={buildHref} />

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
                  <span>Name <span className="text-rose-500">*</span></span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    required
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Phone Number <span className="text-rose-500">*</span></span>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) => updateForm('phoneNumber', event.target.value)}
                    required
                    disabled={modalMode === 'edit'}
                    inputMode="tel"
                    placeholder="03332101476"
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-500"
                  />
                  {modalMode === 'edit' ? <span className="text-xs text-slate-500">Phone number cannot be changed after registration.</span> : null}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>
                    CNIC
                    <span className="ml-1 text-xs text-slate-400">(optional)</span>
                  </span>
                  <input
                    value={form.cnic}
                    onChange={(event) => updateForm('cnic', event.target.value)}
                    inputMode="numeric"
                    placeholder="42101-0536155-7"
                    maxLength={15}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                    <span>Department/شعبہ <span className="text-rose-500">*</span></span>
                    <select
                      value={form.project}
                      onChange={(event) => updateForm('project', event.target.value)}
                      required
                      className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {projects.map((project) => (
                        <option key={project} value={project}>
                          {project}
                        </option>
                      ))}
                    </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm text-slate-700">
                <span>Supervisor <span className="text-rose-500">*</span></span>
                <select
                  value={form.supervisorId}
                  onChange={(event) => updateForm('supervisorId', event.target.value)}
                  required
                  className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select supervisor</option>
                  {availableSupervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.name ?? supervisor.phoneNumber ?? 'Unnamed supervisor'}{supervisor.phoneNumber ? ` - ${supervisor.phoneNumber}` : ''}
                    </option>
                  ))}
                </select>
                {availableSupervisors.length === 0 ? (
                  <span className="text-xs text-rose-600">Add a supervisor for {form.project} before assigning this worker.</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm text-slate-700">
                <span>
                  Address/پتہ
                  <span className="ml-1 text-xs text-slate-400">(optional)</span>
                </span>
                <textarea
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  rows={3}
                  className="resize-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-700">
                <span>Reference <span className="text-xs text-slate-400">(optional)</span></span>
                <input
                  value={form.reference}
                  onChange={(event) => updateForm('reference', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-700">
                <span>
                  {modalMode === 'add' ? 'Password' : 'New Password'}
                  {modalMode === 'add' ? <span className="text-rose-500"> *</span> : null}
                </span>
                <PasswordInput
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
                  disabled={isSubmitting || !form.supervisorId || (modalMode === 'add' && !form.password && defaultPassword.length < 4)}
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

function PaginationControls({
  pagination,
  buildHref,
}: {
  pagination: FieldWorkerManagerProps['pagination'];
  buildHref: (updates: Partial<{ page: number; q: string; project: string; supervisor: string; source: SourceFilter }>) => string;
}) {
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
  const hasPrev = pagination.page > 1;
  const hasNext = pagination.page < pagination.totalPages;

  return (
    <nav className="flex flex-col gap-3 rounded-xl border border-[#dbe4ef] bg-white p-3 text-sm text-[#5f718a] sm:flex-row sm:items-center sm:justify-between sm:p-4" aria-label="Field worker pagination">
      <span className="text-center sm:text-left">
        {pagination.total === 0 ? 'No records' : `Showing ${start}-${end} of ${pagination.total}`}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {hasPrev ? (
          <Link href={buildHref({ page: pagination.page - 1 })} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#dbe4ef] px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#edf2f7] px-3 py-2 text-xs font-semibold text-[#b8c4d4]">Previous</span>
        )}
        {hasNext ? (
          <Link href={buildHref({ page: pagination.page + 1 })} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#dbe4ef] px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
            Next
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#edf2f7] px-3 py-2 text-xs font-semibold text-[#b8c4d4]">Next</span>
        )}
      </div>
    </nav>
  );
}






