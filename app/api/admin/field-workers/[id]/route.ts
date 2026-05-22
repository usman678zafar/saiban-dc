import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import { prisma } from '@/lib/prisma';
import { cnicVariants, formatCnic, isValidCnic } from '@/lib/contact-format';

const updateAdminWorkerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  cnic: z
    .string()
    .transform(formatCnic)
    .refine(isValidCnic, { message: 'CNIC must use the format 42101-0536155-7' }),
  address: z.string().trim().min(1, 'Address is required'),
  reference: z.string().trim().optional().default(''),
  project: z.string().trim().min(1, 'Department is required'),
  supervisorId: z.string().uuid('Supervisor is required'),
  password: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? '')
    .refine((v) => v.length === 0 || v.length >= 4, { message: 'Password must be at least 4 characters' }),
});

const updateSelfWorkerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  cnic: z
    .string()
    .optional()
    .transform((v) => (v ? formatCnic(v) : ''))
    .refine((v) => v.length === 0 || isValidCnic(v), { message: 'CNIC must use the format 42101-0536155-7' }),
  address: z.string().trim().optional().default(''),
  reference: z.string().trim().optional().default(''),
  project: z.string().trim().min(1, 'Department is required'),
  supervisorId: z.string().uuid('Supervisor is required'),
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

interface FieldWorkerRouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: FieldWorkerRouteContext) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json();

    const worker = await prisma.user.findFirst({
      where: { id: params.id, role: 'field_worker' },
      select: { id: true, selfRegistered: true, phoneNumber: true },
    });

    if (!worker) {
      return NextResponse.json({ message: 'Field worker not found.' }, { status: 404 });
    }

    if (worker.selfRegistered) {
      const input = updateSelfWorkerSchema.parse(body);
      const projects = await getFieldWorkerProjectOptions();
      if (!projects.includes(input.project)) {
        return NextResponse.json({ message: 'Department is required' }, { status: 422 });
      }
      const supervisor = await prisma.user.findFirst({
        where: {
          id: input.supervisorId,
          role: 'supervisor',
          project: input.project,
        },
        select: { id: true },
      });

      if (!supervisor) {
        return NextResponse.json({ message: 'Select a supervisor from the same department.' }, { status: 422 });
      }

      const orConditions: Prisma.UserWhereInput[] = input.cnic ? cnicVariants(input.cnic).map((cnic) => ({ cnic })) : [];

      const existingUser = orConditions.length
        ? await prisma.user.findFirst({
          where: { id: { not: params.id }, OR: orConditions },
          select: { id: true },
        })
        : null;

      if (existingUser) {
        return NextResponse.json({ message: 'A field worker with this phone number already exists.' }, { status: 409 });
      }

      const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
      const updatedWorker = await prisma.user.update({
        where: { id: params.id },
        data: {
          name: input.name,
          cnic: input.cnic || null,
          address: input.address,
          reference: input.reference || null,
          project: input.project,
          supervisorId: input.supervisorId,
          ...(passwordHash ? { passwordHash } : {}),
        },
        select: {
          id: true,
          fieldWorkerId: true,
          name: true,
          phoneNumber: true,
          cnic: true,
          address: true,
          reference: true,
          project: true,
          supervisorId: true,
          createdAt: true,
        },
      });

      return NextResponse.json(updatedWorker);
    }

    const input = updateAdminWorkerSchema.parse(body);
    const projects = await getFieldWorkerProjectOptions();
    if (!projects.includes(input.project)) {
      return NextResponse.json({ message: 'Department is required' }, { status: 422 });
    }
    const supervisor = await prisma.user.findFirst({
      where: {
        id: input.supervisorId,
        role: 'supervisor',
        project: input.project,
      },
      select: { id: true },
    });

    if (!supervisor) {
      return NextResponse.json({ message: 'Select a supervisor from the same department.' }, { status: 422 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: { not: params.id },
        OR: [
          ...cnicVariants(input.cnic).map((cnic) => ({ cnic })),
          ...cnicVariants(input.cnic).map((cnic) => ({ email: `${cnic}@field.saiban.local` })),
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'A field worker with this phone number or CNIC already exists.' }, { status: 409 });
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
    const updatedWorker = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: input.name,
        email: `${input.cnic}@field.saiban.local`,
        cnic: input.cnic,
        address: input.address,
        reference: input.reference || null,
        project: input.project,
        supervisorId: input.supervisorId,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        fieldWorkerId: true,
        name: true,
        phoneNumber: true,
        cnic: true,
        address: true,
        reference: true,
        project: true,
        supervisorId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedWorker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update field worker' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: FieldWorkerRouteContext) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  try {
    const worker = await prisma.user.findFirst({
      where: { id: params.id, role: 'field_worker' },
      select: {
        id: true,
        _count: {
          select: {
            applications: true,
            updatedApps: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!worker) {
      return NextResponse.json({ message: 'Field worker not found.' }, { status: 404 });
    }

    const hasLinkedRecords = worker._count.applications > 0 || worker._count.updatedApps > 0 || worker._count.auditLogs > 0;
    if (hasLinkedRecords) {
      return NextResponse.json({ message: 'This field worker has linked records and cannot be deleted.' }, { status: 409 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Field worker deleted successfully.' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: 'Field worker not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete field worker' }, { status: 500 });
  }
}





