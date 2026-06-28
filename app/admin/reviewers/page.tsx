import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import ReviewerManager, { ReviewerListItem } from '@/components/reviewer-manager';
import AdminManagementTabs from '@/components/admin-management-tabs';

export default async function AdminReviewersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/reviewers');
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) redirect('/dashboard');

  const reviewers = await prisma.user.findMany({
    where: { role: UserRole.reviewer },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      cnic: true,
      address: true,
      canCreateApplications: true,
      createdAt: true,
    },
  });

  const items: ReviewerListItem[] = reviewers.map((reviewer) => ({
    ...reviewer,
    createdAt: reviewer.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email} role={session.user.role}>
      <AdminManagementTabs active="reviewers" isSuperAdmin={session.user.role === 'super_admin'} />
      <ReviewerManager reviewers={items} />
    </AdminShell>
  );
}
