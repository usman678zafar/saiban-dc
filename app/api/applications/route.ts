import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrphanApplicationSchema } from '@/lib/validation';

async function getUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const validated = getOrphanApplicationSchema.parse(body) as any;
    const { siblings, relatives, householdAssets, ...payload } = validated;

    const application = await prisma.orphanApplication.create({
      data: {
        ...payload,
        createdById: user.id,
        status: payload.status ?? 'draft',
        siblings: {
          create: siblings ?? [],
        },
        relatives: {
          create: relatives ?? [],
        },
        householdAssets: {
          create: householdAssets ?? [],
        },
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Validation failed' },
      { status: 422 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, siblings, relatives, householdAssets, ...payload } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ message: 'Missing application id' }, { status: 400 });
  }

  try {
    const validated = getOrphanApplicationSchema.parse(body) as any;
    const application = await prisma.orphanApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    if (application.createdById !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {
      ...validated,
      updatedById: user.id,
      status: validated.status ?? application.status,
    };

    if (body.siblings !== undefined) {
      updateData.siblings = {
        deleteMany: {},
        create: validated.siblings ?? [],
      };
    }

    if (body.relatives !== undefined) {
      updateData.relatives = {
        deleteMany: {},
        create: validated.relatives ?? [],
      };
    }

    if (body.householdAssets !== undefined) {
      updateData.householdAssets = {
        deleteMany: {},
        create: validated.householdAssets ?? [],
      };
    }

    const updated = await prisma.orphanApplication.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Validation failed' },
      { status: 422 },
    );
  }
}
