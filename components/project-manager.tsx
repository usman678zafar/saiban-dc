'use client';

import { FormEvent, useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ProjectItem = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt?: string;
};

export default function ProjectManager({ projects }: { projects: ProjectItem[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const addProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to add department.');
      return;
    }

    setName('');
    router.refresh();
  };

  const startEdit = (project: ProjectItem) => {
    if (project.isDefault) return;
    setEditingId(project.id);
    setEditName(project.name);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (project: ProjectItem) => {
    if (project.isDefault) return;
    setSavingEditId(project.id);
    setMessage(null);

    const response = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    const result = await response.json();
    setSavingEditId(null);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to update department.');
      return;
    }

    cancelEdit();
    router.refresh();
  };

  const deleteProject = async (project: ProjectItem) => {
    if (project.isDefault) return;
    if (!window.confirm(`Delete department "${project.name}"?`)) return;

    setDeletingId(project.id);
    setMessage(null);
    const response = await fetch(`/api/admin/projects/${project.id}`, { method: 'DELETE' });
    const result = await response.json();
    setDeletingId(null);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to delete department.');
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[#0f1f33]">Add Department</h2>
        <form onSubmit={addProject} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Department name"
            className="rounded-xl border border-[#dbe4ef] bg-[#f6f9fd] px-4 py-3 text-sm text-[#0f1f33] outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563eb] disabled:opacity-60"
          >
            <Plus size={18} />
            {isSubmitting ? 'Adding...' : 'Add Department'}
          </button>
        </form>
        {message ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <table className="min-w-full text-left text-sm text-[#506784]">
          <thead className="bg-blue-600 text-xs uppercase tracking-[0.12em] text-white">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t border-[#edf2f7]">
                <td className="px-4 py-4 font-semibold text-[#0f1f33]">
                  {editingId === project.id ? (
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-sm outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
                    />
                  ) : (
                    project.name
                  )}
                </td>
                <td className="px-4 py-4">{project.isDefault ? 'Default' : 'Custom'}</td>
                <td className="px-4 py-4 text-right">
                  {editingId === project.id ? (
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(project)}
                        disabled={savingEditId === project.id || editName.trim() === ''}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        aria-label={`Save ${project.name}`}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={savingEditId === project.id}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784] hover:bg-[#f6f9fd] disabled:opacity-60"
                        aria-label="Cancel edit"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : !project.isDefault ? (
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(project)}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#506784] hover:bg-[#f6f9fd]"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProject(project)}
                        disabled={deletingId === project.id}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50 disabled:opacity-60"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8a9bb3]">Protected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
