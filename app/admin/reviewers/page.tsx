import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminShell from '@/components/admin-shell';
import ReviewerManager, { ReviewerListItem } from '@/components/reviewer-manager';

export default async function AdminReviewersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/signin?callbackUrl=/admin/reviewers');
  if (session.user.role !== 'admin') redirect('/dashboard');

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
      createdAt: true,
    },
  });

  const items: ReviewerListItem[] = reviewers.map((reviewer) => ({
    ...reviewer,
    createdAt: reviewer.createdAt.toISOString(),
  }));

  return (
    <AdminShell email={session.user.email}>
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f1f33] sm:text-3xl">Manage Reviewers</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#5f718a]">
          Add reviewers who approve supervisor-reviewed applications before admin final review.
        </p>
      </header>

      <ReviewerManager reviewers={items} />
    </AdminShell>
  );
}
