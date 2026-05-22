import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import { prisma } from '@/lib/prisma';
import { cnicVariants, formatCnic, isValidCnic } from '@/lib/contact-format';

const updateSupervisorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  project: z.string().trim().min(1, 'Department is required'),
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
    const input = updateSupervisorSchema.parse(await request.json());
    const projects = await getFieldWorkerProjectOptions();
    if (!projects.includes(input.project)) {
      return NextResponse.json({ message: 'Department is required' }, { status: 422 });
    }
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
    const supervisor = await prisma.user.update({
      where: { id: params.id, role: UserRole.supervisor },
      data: {
        name: input.name,
        cnic: input.cnic || null,
        address: input.address || null,
        project: input.project,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        cnic: true,
        address: true,
        project: true,
        createdAt: true,
      },
    });

    return NextResponse.json(supervisor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update supervisor' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  const supervisor = await prisma.user.findFirst({
    where: { id: params.id, role: UserRole.supervisor },
    select: {
      id: true,
      _count: {
        select: {
          updatedApps: true,
          auditLogs: true,
          fieldWorkers: true,
        },
      },
    },
  });

  if (!supervisor) {
    return NextResponse.json({ message: 'Supervisor not found.' }, { status: 404 });
  }

  if (supervisor._count.fieldWorkers > 0) {
    return NextResponse.json({ message: 'This supervisor has assigned field workers and cannot be deleted.' }, { status: 409 });
  }

  if (supervisor._count.updatedApps > 0 || supervisor._count.auditLogs > 0) {
    return NextResponse.json({ message: 'This supervisor has review history and cannot be deleted.' }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ message: 'Supervisor deleted successfully.' });
}





