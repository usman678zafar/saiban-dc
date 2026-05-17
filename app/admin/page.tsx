import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowRight, CheckCircle2, ClipboardList, Database, FileCheck2, FileText, ShieldCheck, UsersRound } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';

type AdminMetric = {
  label: string;
  value: number;
  detail: string;
  tone: 'blue' | 'violet' | 'emerald' | 'orange' | 'red' | 'sky' | 'slate';
};

type RecentApplication = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  migrationStatus: string;
  updatedAt: Date;
};

type FieldWorker = {
  id: string;
  fieldWorkerId: string | null;
  name: string | null;
  phoneNumber: string | null;
  cnic: string | null;
  address: string | null;
  project: string | null;
  createdAt: Date;
};

const adminVisibleApplicationWhere = {
  status: {
    not: 'draft' as const,
  },
};

async function getAdminPortalData() {
  const [
    totalApplications,
    submittedApplications,
    validatedApplications,
    migratedApplications,
    rejectedApplications,
    totalUsers,
    adminUsers,
    fieldWorkers,
    recentApplications,
  ] = await Promise.all([
    prisma.orphanApplication.count({ where: adminVisibleApplicationWhere }),
    prisma.orphanApplication.count({ where: { status: 'submitted' } }),
    prisma.orphanApplication.count({ where: { status: 'validated' } }),
    prisma.orphanApplication.count({ where: { status: 'migrated' } }),
    prisma.orphanApplication.count({ where: { status: 'rejected' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.findMany({
      where: { role: 'field_worker' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fieldWorkerId: true,
        name: true,
        phoneNumber: true,
        cnic: true,
        address: true,
        project: true,
        createdAt: true,
      },
    }) as Promise<FieldWorker[]>,
    prisma.orphanApplication.findMany({
      where: adminVisibleApplicationWhere,
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        migrationStatus: true,
        updatedAt: true,
      },
    }) as Promise<RecentApplication[]>,
  ]);

  const metrics: AdminMetric[] = [
    { label: 'Total Applications', value: totalApplications, detail: 'All records', tone: 'blue' },
    { label: 'Submitted', value: submittedApplications, detail: 'Awaiting review', tone: 'violet' },
    { label: 'Validated', value: validatedApplications, detail: 'Ready records', tone: 'emerald' },
    { label: 'Migrated', value: migratedApplications, detail: 'Moved onward', tone: 'sky' },
    { label: 'Rejected', value: rejectedApplications, detail: 'Needs attention', tone: 'red' },
    { label: 'Users', value: totalUsers, detail: 'Portal access', tone: 'orange' },
    { label: 'Admins', value: adminUsers, detail: 'Admin users', tone: 'slate' },
  ];

  return { metrics, fieldWorkers, recentApplications };
}

export default async function AdminPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin?callbackUrl=/admin');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const { metrics, fieldWorkers, recentApplications } = await getAdminPortalData();
  const metricStyles = {
    blue: { icon: ClipboardList, tile: 'bg-[#e8f1ff] text-[#3b82f6]', value: 'text-[#3b82f6]' },
    violet: { icon: FileText, tile: 'bg-[#f0e8ff] text-[#8357f4]', value: 'text-[#8357f4]' },
    emerald: { icon: CheckCircle2, tile: 'bg-[#e5f8f0] text-[#10b981]', value: 'text-[#10b981]' },
    orange: { icon: UsersRound, tile: 'bg-[#fff2dd] text-[#f59e0b]', value: 'text-[#f59e0b]' },
    red: { icon: FileCheck2, tile: 'bg-[#ffe8e8] text-[#ef4444]', value: 'text-[#ef4444]' },
    sky: { icon: Database, tile: 'bg-[#e6f7ff] text-[#0284c7]', value: 'text-[#0284c7]' },
    slate: { icon: ShieldCheck, tile: 'bg-[#edf2f7] text-[#475569]', value: 'text-[#475569]' },
  };

  return (
    <AdminShell email={session.user.email}>
          <header className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Admin Overview</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[#5f718a] sm:text-sm">
                Review application movement, manage field access, and open records that need attention.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link href="/admin/applications/new" className="rounded-lg bg-[#3b82f6] px-3 py-2 text-center text-xs font-semibold text-white shadow-[0_10px_20px_rgba(59,130,246,0.18)] hover:bg-[#2563eb]">
                New Application
              </Link>
              <Link href="/admin/applications" className="rounded-lg border border-[#dbe4ef] bg-white px-3 py-2 text-center text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
                View All
              </Link>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            {metrics.map((metric: AdminMetric) => {
              const style = metricStyles[metric.tone];
              const Icon = style.icon;

              return (
              <div key={metric.label} className="rounded-lg border border-[#dbe4ef] bg-white p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${style.tile}`}>
                    <Icon size={17} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xl font-semibold leading-none ${style.value}`}>{metric.value}</p>
                    <p className="mt-1.5 truncate text-xs font-medium text-[#506784]">{metric.label}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#8a9bb3]">{metric.detail}</p>
                  </div>
                </div>
              </div>
              );
            })}
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_430px]">
            <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#edf2f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#0f1f33]">Recent Applications</h2>
                  <p className="mt-0.5 text-xs text-[#8a9bb3]">Latest records sorted by update time.</p>
                </div>
                <Link href="/admin/applications" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#eef4fb] sm:w-auto">
                  View All
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="divide-y divide-[#edf2f7]">
                {recentApplications.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-[#8a9bb3] sm:px-6">No applications found.</p>
                ) : (
                  recentApplications.map((application: RecentApplication) => (
                    <div key={application.id} className="grid gap-2 px-4 py-3 hover:bg-[#f8fbff] sm:grid-cols-[minmax(0,1.4fr)_auto] sm:items-center lg:grid-cols-[minmax(0,1.35fr)_minmax(90px,0.55fr)_minmax(90px,0.55fr)_minmax(92px,0.55fr)_auto]">
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold leading-6 text-[#0f1f33] sm:text-sm">{application.registrationNumber ?? application.id}</p>
                        <p className="mt-1 truncate text-sm text-[#8a9bb3] sm:text-xs">{application.childName ?? 'No child name'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs sm:justify-end lg:contents">
                        <span className="rounded-lg bg-[#edf4ff] px-2 py-1 font-semibold capitalize text-[#2563eb] lg:bg-transparent lg:px-0 lg:py-0 lg:text-sm lg:font-medium lg:text-[#506784]">{application.status}</span>
                        <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold capitalize text-[#506784] lg:bg-transparent lg:px-0 lg:py-0 lg:text-sm lg:font-medium">{application.migrationStatus}</span>
                        <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold text-[#8a9bb3] lg:bg-transparent lg:px-0 lg:py-0 lg:text-sm lg:font-medium">{application.updatedAt.toLocaleDateString()}</span>
                        <Link href={`/admin/applications/${application.id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff] lg:justify-self-end">
                          Review
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
              <div className="border-b border-[#edf2f7] px-4 py-3">
                <h2 className="text-base font-semibold text-[#0f1f33]">Field Workers</h2>
                <p className="mt-0.5 text-xs text-[#8a9bb3]">People with access to the field worker portal.</p>
              </div>
              <div className="max-h-[480px] overflow-auto">
                {fieldWorkers.length === 0 ? (
                  <p className="p-4 text-sm text-[#8a9bb3]">No field workers yet.</p>
                ) : (
                  <table className="min-w-full text-left text-xs text-[#506784]">
                    <thead className="sticky top-0 bg-[#f6f9fd] text-[11px] uppercase tracking-wide text-[#64748b]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Worker</th>
                        <th className="px-3 py-2 font-semibold">Project</th>
                        <th className="px-3 py-2 font-semibold">Phone</th>
                        <th className="px-3 py-2 font-semibold">Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2f7]">
                      {fieldWorkers.map((worker: FieldWorker) => (
                        <tr key={worker.id} className="hover:bg-[#f8fbff]">
                          <td className="px-3 py-2 align-top">
                            <p className="max-w-[150px] truncate font-semibold text-[#0f1f33]">{worker.name ?? 'Unnamed worker'}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-[#2563eb]">{worker.fieldWorkerId ?? worker.id}</p>
                          </td>
                          <td className="max-w-[110px] truncate px-3 py-2 align-top">{worker.project ?? '-'}</td>
                          <td className="px-3 py-2 align-top">
                            <p className="whitespace-nowrap">{worker.phoneNumber ?? '-'}</p>
                            <p className="mt-0.5 whitespace-nowrap text-[11px] text-[#8a9bb3]">{worker.cnic ?? '-'}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top text-[#8a9bb3]">{worker.createdAt.toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
    </AdminShell>
  );
}
