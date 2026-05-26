import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cnicVariants, formatCnic, isValidCnic } from '@/lib/contact-format';
import { getSessionVersionUpdateData } from '@/lib/session-version';

const updateReviewerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  cnic: z.string().transform((value) => (value ? formatCnic(value) : '')).refine((value) => value.length === 0 || isValidCnic(value), {
    message: 'CNIC must use the format 42101-0536155-7',
  }).optional().default(''),
  address: z.string().trim().optional().default(''),
  password: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? '')
    .refine((v) => v.length === 0 || v.length >= 4, { message: 'Password must be at least 4 characters' }),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return { response: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) };
  }

  return { session };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  try {
    const input = updateReviewerSchema.parse(await request.json());
    const orConditions = cnicVariants(input.cnic).map((cnic) => ({ cnic }));
    const existing = orConditions.length
      ? await prisma.user.findFirst({
        where: {
          id: { not: params.id },
          OR: orConditions,
        },
        select: { id: true },
      })
      : null;

    if (existing) {
      return NextResponse.json({ message: 'A user with this phone number or CNIC already exists.' }, { status: 409 });
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
    const sessionVersionUpdate = passwordHash ? await getSessionVersionUpdateData() : {};
    const reviewer = await prisma.user.update({
      where: { id: params.id, role: UserRole.reviewer },
      data: {
        name: input.name,
        cnic: input.cnic || null,
        address: input.address || null,
        ...(passwordHash ? { passwordHash } : {}),
        ...(passwordHash ? { passwordChangeRequired: true } : {}),
        ...sessionVersionUpdate,
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
