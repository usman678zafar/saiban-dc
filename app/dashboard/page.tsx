import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">Field registration summary and application metrics.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/applications" className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              View applications
            </Link>
            {isAdmin ? (
              <Link href="/api/applications/export?format=csv" className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Export all apps
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total applications', value: stats.total },
            { label: 'Draft applications', value: stats.draft },
            { label: 'Submitted applications', value: stats.submitted },
            { label: 'Validated applications', value: stats.validated },
            { label: 'Rejected applications', value: stats.rejected },
            { label: 'Migrated applications', value: stats.migrated },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
