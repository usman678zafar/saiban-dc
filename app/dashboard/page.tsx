import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppShell from '@/components/app-shell';

async function getStats() {
  const [total, draft, submitted, validated, rejected, migrated] = await Promise.all([
    prisma.orphanApplication.count(),
    prisma.orphanApplication.count({ where: { status: 'draft' } }),
    prisma.orphanApplication.count({ where: { status: 'submitted' } }),
    prisma.orphanApplication.count({ where: { status: 'validated' } }),
    prisma.orphanApplication.count({ where: { status: 'rejected' } }),
    prisma.orphanApplication.count({ where: { status: 'migrated' } }),
  ]);

  return { total, draft, submitted, validated, rejected, migrated };
}

type StatItem = {
  label: string;
  value: number;
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';
  const stats = await getStats();
  const statItems: StatItem[] = [
    { label: 'Total applications', value: stats.total },
    { label: 'Draft applications', value: stats.draft },
    { label: 'Submitted applications', value: stats.submitted },
    { label: 'Validated applications', value: stats.validated },
    { label: 'Rejected applications', value: stats.rejected },
    { label: 'Migrated applications', value: stats.migrated },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Track registration progress and jump into the next field-work action."
      maxWidth="max-w-6xl"
      actions={
        <>
          <Link href="/applications" className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            View Applications
          </Link>
          {isAdmin ? (
            <Link href="/api/applications/export?format=csv" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Export CSV
            </Link>
          ) : null}
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statItems.map((stat: StatItem) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
      </div>
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Link href="/applications/new" className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950 hover:bg-blue-100">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Primary Action</p>
          <p className="mt-2 text-xl font-semibold">Start New Application</p>
          <p className="mt-2 text-sm text-blue-900">Open the registration wizard and capture a new case.</p>
        </Link>
        <Link href="/applications" className="rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-sm hover:bg-slate-50">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Review</p>
          <p className="mt-2 text-xl font-semibold">Recent Applications</p>
          <p className="mt-2 text-sm text-slate-600">Continue drafts or review submitted records.</p>
        </Link>
        {isAdmin ? (
          <Link href="/admin" className="rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-sm hover:bg-slate-50">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Admin</p>
            <p className="mt-2 text-xl font-semibold">Manage Team</p>
            <p className="mt-2 text-sm text-slate-600">Add field workers and handle exports.</p>
          </Link>
        ) : null}
      </section>
    </AppShell>
  );
}
