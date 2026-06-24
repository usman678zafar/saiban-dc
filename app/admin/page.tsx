import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ApplicationStatus } from '@prisma/client';
import { CheckCircle2, ClipboardList, FileCheck2, FileText, RotateCcw, Send, ShieldCheck, UsersRound } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import ViewerGeoStoryMap, { type ViewerGeoApplication } from '@/components/viewer-geo-story-map';
import { ViewerLanguageProvider } from '@/components/viewer-language';

type AdminMetric = {
  label: string;
  value: number;
  tone: 'blue' | 'steel' | 'violet' | 'indigo' | 'emerald' | 'sky' | 'red' | 'orange' | 'amber' | 'charcoal';
};

const PAKISTAN_GEO_BOUNDS = {
  minLat: 23.35,
  maxLat: 37.1,
  minLng: 60.75,
  maxLng: 77.25,
};

async function getAdminPortalData() {
  const [applicationStatusCounts, allApplicationStatusCounts, submittedByFieldWorkersCount, totalUsers, mappedApplications] = await Promise.all([
    prisma.orphanApplication.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.orphanApplication.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.orphanApplication.count({
      where: {
        status: ApplicationStatus.submitted,
        createdBy: { role: 'field_worker' },
      },
    }),
    prisma.user.count(),
    prisma.orphanApplication.findMany({
      where: {
        latitude: { gte: PAKISTAN_GEO_BOUNDS.minLat, lte: PAKISTAN_GEO_BOUNDS.maxLat },
        longitude: { gte: PAKISTAN_GEO_BOUNDS.minLng, lte: PAKISTAN_GEO_BOUNDS.maxLng },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        registrationNumber: true,
        childName: true,
        status: true,
        collectorProject: true,
        province: true,
        district: true,
        tehsil: true,
        city: true,
        fullAddress: true,
        latitude: true,
        longitude: true,
        gpsAccuracyMeters: true,
        gpsCapturedAt: true,
      },
    }),
  ]);

  const applicationCountByStatus = new Map(applicationStatusCounts.map((item) => [item.status, item._count._all]));
  const allApplicationCountByStatus = new Map(allApplicationStatusCounts.map((item) => [item.status, item._count._all]));
  const totalApplications = allApplicationStatusCounts.reduce((total, item) => total + item._count._all, 0);
  const draftApplications = allApplicationCountByStatus.get(ApplicationStatus.draft) ?? 0;
  const needsCorrectionApplications = applicationCountByStatus.get(ApplicationStatus.needs_correction) ?? 0;
  const supervisorApprovedApplications = applicationCountByStatus.get(ApplicationStatus.supervisor_approved) ?? 0;
  const reviewerApprovedApplications = applicationCountByStatus.get(ApplicationStatus.reviewer_approved) ?? 0;
  const onHoldApplications = applicationCountByStatus.get(ApplicationStatus.admin_on_hold) ?? 0;
  const adminApprovedApplications =
    (applicationCountByStatus.get(ApplicationStatus.admin_approved) ?? 0) +
    (applicationCountByStatus.get(ApplicationStatus.validated) ?? 0);
  const rejectedApplications = applicationCountByStatus.get(ApplicationStatus.rejected) ?? 0;

  const metrics: AdminMetric[] = [
    { label: 'Total Applications', value: totalApplications, tone: 'blue' },
    { label: 'Drafts', value: draftApplications, tone: 'steel' },
    { label: 'Applications Submitted', value: submittedByFieldWorkersCount, tone: 'violet' },
    { label: 'Supervisor Approved', value: supervisorApprovedApplications, tone: 'sky' },
    { label: 'Reviewer Approved', value: reviewerApprovedApplications, tone: 'indigo' },
    { label: 'On Hold', value: onHoldApplications, tone: 'amber' },
    { label: 'Needs Correction', value: needsCorrectionApplications, tone: 'orange' },
    { label: 'Final Approved', value: adminApprovedApplications, tone: 'emerald' },
    { label: 'Rejected', value: rejectedApplications, tone: 'red' },
    { label: 'System Users', value: totalUsers, tone: 'amber' },
  ];

  const geoApplications: ViewerGeoApplication[] = mappedApplications
    .filter((application): application is typeof application & { latitude: number; longitude: number } => (
      typeof application.latitude === 'number'
      && typeof application.longitude === 'number'
      && Number.isFinite(application.latitude)
      && Number.isFinite(application.longitude)
    ))
    .map((application) => ({
      id: application.id,
      registrationNumber: application.registrationNumber,
      childName: application.childName,
      status: application.status,
      collectorProject: application.collectorProject,
      province: application.province,
      district: application.district,
      tehsil: application.tehsil,
      city: application.city,
      fullAddress: application.fullAddress,
      latitude: application.latitude,
      longitude: application.longitude,
      gpsAccuracyMeters: application.gpsAccuracyMeters,
      gpsCapturedAt: application.gpsCapturedAt?.toISOString() ?? null,
    }));

  return { metrics, geoApplications };
}

export default async function AdminPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin?callbackUrl=/admin');
  }

  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const { metrics, geoApplications } = await getAdminPortalData();
  const metricStyles = {
    blue: { icon: ClipboardList, card: 'bg-[#2563eb]' },
    steel: { icon: FileText, card: 'bg-[#64748b]' },
    violet: { icon: Send, card: 'bg-[#8b5cf6]' },
    indigo: { icon: Send, card: 'bg-[#6366f1]' },
    emerald: { icon: CheckCircle2, card: 'bg-[#54cc59]' },
    sky: { icon: ShieldCheck, card: 'bg-[#20b8d8]' },
    red: { icon: FileCheck2, card: 'bg-[#ff5f6d]' },
    orange: { icon: RotateCcw, card: 'bg-[#ffad47]' },
    amber: { icon: UsersRound, card: 'bg-[#f59e0b]' },
    charcoal: { icon: FileText, card: 'bg-[#475569]' },
  };

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
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
              <Link href="/admin/applications?status=all" className="rounded-lg border border-[#dbe4ef] bg-white px-3 py-2 text-center text-xs font-semibold text-[#0f1f33] hover:bg-[#f6f9fd]">
                View All
              </Link>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {metrics.map((metric: AdminMetric) => {
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

          <ViewerLanguageProvider>
            <ViewerGeoStoryMap points={geoApplications} languageOverride="en" />
          </ViewerLanguageProvider>
    </AdminShell>
  );
}






