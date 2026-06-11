import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildApplicationReviewPdf } from '@/lib/application-review-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ApplicationReviewRouteProps {
  params: {
    id: string;
  };
}

async function getApplication(id: string) {
  return prisma.orphanApplication.findUnique({
    where: { id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
      documents: {
        select: {
          documentType: true,
        },
      },
    },
  });
}

function filenamePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'application';
}

export async function GET(_request: Request, { params }: ApplicationReviewRouteProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const application = await getApplication(params.id);
  if (!application) {
    return NextResponse.json({ message: 'Application not found' }, { status: 404 });
  }

  try {
    const pdf = await buildApplicationReviewPdf(application);
    const title = application.registrationNumber ?? application.id;

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="application-review-${filenamePart(title)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Application review PDF generation failed', {
      applicationId: application.id,
      registrationNumber: application.registrationNumber,
      error,
    });

    return NextResponse.json(
      {
        message: 'Unable to generate application review PDF.',
        detail: error instanceof Error ? error.message : 'Unknown PDF generation error',
      },
      { status: 500 },
    );
  }
}
