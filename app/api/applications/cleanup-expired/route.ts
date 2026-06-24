import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteExpiredIncompleteApplications } from '@/lib/expired-applications';

export const dynamic = 'force-dynamic';

async function authorizeCleanup(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return { actorId: null, source: 'cron' as const };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (user?.role !== 'super_admin') return null;
  return { actorId: user.id, source: 'super_admin' as const };
}

async function handleCleanup(request: NextRequest) {
  const authorized = await authorizeCleanup(request);
  if (!authorized) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.trunc(limitParam), 1000)
    : 250;

  try {
    const result = await deleteExpiredIncompleteApplications({
      actorId: authorized.actorId,
      limit,
    });

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} expired incomplete application${result.deletedCount === 1 ? '' : 's'}.`,
      ...result,
      source: authorized.source,
    });
  } catch (error) {
    console.error('Expired incomplete application cleanup failed:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}
