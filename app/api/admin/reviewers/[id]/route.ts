import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const digitsOnly = (value: string) => value.replace(/\D/g, '');
const reviewerEmailForPhone = (phoneNumber: string) => `${phoneNumber.replace(/[^a-zA-Z0-9]+/g, '')}@reviewer.saiban.local`;

const updateReviewerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().trim().min(1, 'Phone number is required').refine((value) => digitsOnly(value).length >= 4, {
    message: 'Phone number must contain at least 4 digits',
  }),
  cnic: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  if (session.user.role !== 'admin') {
    return { response: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) };
  }

  return { session };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  try {
    const input = updateReviewerSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: params.id },
        OR: [
          { email: reviewerEmailForPhone(input.phoneNumber) },
          { phoneNumber: input.phoneNumber },
          ...(input.cnic ? [{ cnic: input.cnic }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: 'A user with this phone number or CNIC already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(digitsOnly(input.phoneNumber).slice(-4), 10);
    const reviewer = await prisma.user.update({
      where: { id: params.id, role: UserRole.reviewer },
      data: {
        name: input.name,
        email: reviewerEmailForPhone(input.phoneNumber),
        phoneNumber: input.phoneNumber,
        cnic: input.cnic || null,
        address: input.address || null,
        passwordHash,
      },
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

    return NextResponse.json(reviewer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update reviewer' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  const reviewer = await prisma.user.findFirst({
    where: { id: params.id, role: UserRole.reviewer },
    select: {
      id: true,
      _count: {
        select: {
          updatedApps: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!reviewer) {
    return NextResponse.json({ message: 'Reviewer not found.' }, { status: 404 });
  }

  if (reviewer._count.updatedApps > 0 || reviewer._count.auditLogs > 0) {
    return NextResponse.json({ message: 'This reviewer has review history and cannot be deleted.' }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ message: 'Reviewer deleted successfully.' });
}
