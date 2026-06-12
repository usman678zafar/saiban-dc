import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ApplicationStatus } from '@prisma/client';
import { ArrowRight, CheckCircle2, ClipboardList, FileCheck2, FileText, RotateCcw, Send, ShieldCheck, UsersRound } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { prisma } from '@/lib/prisma';
import ViewerShell from '@/components/viewer-shell';
import { formatDate } from '@/lib/date-format';

type ViewerMetric = {
  label: string;
  value: number;
  tone: 'blue' | 'steel' | 'violet' | 'indigo' | 'emerald' | 'sky' | 'red' | 'amber' | 'orange' | 'charcoal';
};

type RecentApplication = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  updatedAt: Date;
};

function countStatus(counts: Map<ApplicationStatus, number>, status: ApplicationStatus) {
  return counts.get(status) ?? 0;
}

async function getViewerPortalData() {
  const [applicationStatusCounts, totalUsers, adminUsers, recentApplications] = await Promise.all([
    prisma.orphanApplication.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: ['admin', 'super_admin'] } } }),
    prisma.orphanApplication.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        updatedAt: true,
      },
    }) as Promise<RecentApplication[]>,
  ]);

  const applicationCountByStatus = new Map(applicationStatusCounts.map((item) => [item.status, item._count._all]));
  const totalApplications = applicationStatusCounts.reduce((total, item) => total + item._count._all, 0);
  const finalApprovedApplications =
    countStatus(applicationCountByStatus, ApplicationStatus.admin_approved) +
    countStatus(applicationCountByStatus, ApplicationStatus.validated) +
    countStatus(applicationCountByStatus, ApplicationStatus.migrated);

  const metrics: ViewerMetric[] = [
    { label: 'Total Applications', value: totalApplications, tone: 'blue' },
    { label: 'Drafts', value: countStatus(applicationCountByStatus, ApplicationStatus.draft), tone: 'steel' },
    { label: 'Submitted', value: countStatus(applicationCountByStatus, ApplicationStatus.submitted), tone: 'violet' },
    { label: 'Needs Correction', value: countStatus(applicationCountByStatus, ApplicationStatus.needs_correction), tone: 'amber' },
    { label: 'Supervisor Approved', value: countStatus(applicationCountByStatus, ApplicationStatus.supervisor_approved), tone: 'indigo' },
    { label: 'Reviewer Approved', value: countStatus(applicationCountByStatus, ApplicationStatus.reviewer_approved), tone: 'charcoal' },
    { label: 'Final Approved', value: finalApprovedApplications, tone: 'emerald' },
    { label: 'Rejected', value: countStatus(applicationCountByStatus, ApplicationStatus.rejected), tone: 'red' },
    { label: 'Users', value: totalUsers, tone: 'orange' },
    { label: 'Admins', value: adminUsers, tone: 'sky' },
  ];

  return { metrics, recentApplications };
}

export default async function ViewerPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin?callbackUrl=/viewer');
  }

  if (session.user.role !== 'viewer') {
    redirect('/dashboard');
  }

  const { metrics, recentApplications } = await getViewerPortalData();
  const metricStyles = {
    blue: { icon: ClipboardList, card: 'bg-[#2563eb]' },
    steel: { icon: FileText, card: 'bg-[#64748b]' },
    violet: { icon: Send, card: 'bg-[#8b5cf6]' },
    indigo: { icon: ShieldCheck, card: 'bg-[#6366f1]' },
    emerald: { icon: CheckCircle2, card: 'bg-[#54cc59]' },
    sky: { icon: UsersRound, card: 'bg-[#20b8d8]' },
    red: { icon: FileCheck2, card: 'bg-[#ff5f6d]' },
    amber: { icon: RotateCcw, card: 'bg-[#f59e0b]' },
    orange: { icon: UsersRound, card: 'bg-[#ffad47]' },
    charcoal: { icon: FileText, card: 'bg-[#475569]' },
  };

  return (
    <ViewerShell email={session.user.email}>
      <header className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Viewer Overview</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#5f718a] sm:text-sm">
            Read-only application totals and recent records across every department.
          </p>
        </div>
        <Link href="/viewer/applications" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] bg-white px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
          View All Applications
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const style = metricStyles[metric.tone];
          const Icon = style.icon;

          return (
            <div key={metric.label} className={`min-h-[132px] rounded-lg px-5 py-7 text-white shadow-[0_18px_32px_rgba(15,31,51,0.10)] 2xl:px-8 ${style.card}`}>
              <div className="flex h-full items-center gap-5 2xl:gap-8">
                <div className="flex size-16 shrink-0 items-center justify-center text-white/95">
                  <Icon size={52} strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="break-words text-xl font-medium leading-6 text-white">{metric.label}</p>
                  <p className="mt-2 truncate text-3xl font-semibold leading-none text-white">{metric.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#edf2f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0f1f33]">Recent Applications</h2>
            <p className="mt-0.5 text-xs text-[#8a9bb3]">Latest records sorted by update time.</p>
          </div>
          <Link href="/viewer/applications" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-xs font-semibold text-[#0f1f33] hover:bg-[#eef4fb] sm:w-auto">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="divide-y divide-[#edf2f7]">
          {recentApplications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a9bb3] sm:px-6">No applications found.</p>
          ) : (
            recentApplications.map((application) => (
              <div key={application.id} className="grid gap-2 px-4 py-3 hover:bg-[#f8fbff] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold leading-6 text-[#0f1f33] sm:text-sm">{application.registrationNumber ?? application.id}</p>
                  <p className="mt-1 truncate text-sm text-[#8a9bb3] sm:text-xs">{application.childName ?? 'No child name'}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
                  <span className="rounded-lg bg-[#edf4ff] px-2 py-1 font-semibold text-[#2563eb]">
                    {applicationStatusLabel(application.status)}
                  </span>
                  <span className="rounded-lg bg-[#f6f9fd] px-2 py-1 font-semibold text-[#8a9bb3]">{formatDate(application.updatedAt)}</span>
                  <Link href={`/viewer/applications/${application.id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#edf4ff] px-3 py-2 text-xs font-semibold text-[#2563eb] hover:bg-[#dceaff]">
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </ViewerShell>
  );
}
