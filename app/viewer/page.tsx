import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ApplicationStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ViewerShell from '@/components/viewer-shell';
import { type ViewerGeoApplication } from '@/components/viewer-geo-story-map';
import ViewerOverviewContent, { type ViewerMetric } from '@/components/viewer-overview-content';

const PAKISTAN_GEO_BOUNDS = {
  minLat: 23.35,
  maxLat: 37.1,
  minLng: 60.75,
  maxLng: 77.25,
};

function countStatus(counts: Map<ApplicationStatus, number>, status: ApplicationStatus) {
  return counts.get(status) ?? 0;
}

async function getViewerPortalData() {
  const [applicationStatusCounts, totalUsers, adminUsers, mappedApplications] = await Promise.all([
    prisma.orphanApplication.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: ['admin', 'super_admin'] } } }),
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
  const totalApplications = applicationStatusCounts.reduce((total, item) => total + item._count._all, 0);
  const finalApprovedApplications =
    countStatus(applicationCountByStatus, ApplicationStatus.admin_approved) +
    countStatus(applicationCountByStatus, ApplicationStatus.validated) +
    countStatus(applicationCountByStatus, ApplicationStatus.migrated);

  const metrics: ViewerMetric[] = [
    { key: 'totalApplications', value: totalApplications, tone: 'blue' },
    { key: 'drafts', value: countStatus(applicationCountByStatus, ApplicationStatus.draft), tone: 'steel' },
    { key: 'submitted', value: countStatus(applicationCountByStatus, ApplicationStatus.submitted), tone: 'violet' },
    { key: 'needsCorrection', value: countStatus(applicationCountByStatus, ApplicationStatus.needs_correction), tone: 'amber' },
    { key: 'supervisorApproved', value: countStatus(applicationCountByStatus, ApplicationStatus.supervisor_approved), tone: 'indigo' },
    { key: 'reviewerApproved', value: countStatus(applicationCountByStatus, ApplicationStatus.reviewer_approved), tone: 'charcoal' },
    { key: 'finalApproved', value: finalApprovedApplications, tone: 'emerald' },
    { key: 'rejected', value: countStatus(applicationCountByStatus, ApplicationStatus.rejected), tone: 'red' },
    { key: 'users', value: totalUsers, tone: 'orange' },
    { key: 'admins', value: adminUsers, tone: 'sky' },
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

export default async function ViewerPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin?callbackUrl=/viewer');
  }

  if (session.user.role !== 'viewer') {
    redirect('/dashboard');
  }

  const { metrics, geoApplications } = await getViewerPortalData();

  return (
    <ViewerShell email={session.user.email}>
      <ViewerOverviewContent metrics={metrics} geoApplications={geoApplications} />
    </ViewerShell>
  );
}
