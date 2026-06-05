import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cnicVariants, formatCnic, isValidCnic } from '@/lib/contact-format';
import { logSystemAudit } from '@/lib/system-audit';

const updateFieldWorkerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  cnic: z
    .string()
    .optional()
    .transform((v) => (v ? formatCnic(v) : ''))
    .refine((v) => v.length === 0 || isValidCnic(v), { message: 'CNIC must use the format 42101-0536155-7' }),
  address: z.string().trim().optional().default(''),
  reference: z.string().trim().optional().default(''),
  project: z.string().trim().min(1, 'Department is required'),
  supervisorId: z.string().uuid().optional(),
  password: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? '')
    .refine((v) => v.length === 0 || v.length >= 4, { message: 'Password must be at least 4 characters' }),
});

async function requireSupervisorManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  if (session.user.role !== 'supervisor') {
    return { response: NextResponse.json({ message: 'Supervisor access required' }, { status: 403 }) };
  }

  const supervisor = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      project: true,
      canManageFieldWorkers: true,
      supervisorDepartments: {
        select: { project: true },
      },
    },
  });

  if (!supervisor?.canManageFieldWorkers) {
    return { response: NextResponse.json({ message: 'Field worker management access is not enabled for this supervisor.' }, { status: 403 }) };
  }

  const projects = supervisor.supervisorDepartments.length
    ? supervisor.supervisorDepartments.map((department) => department.project)
    : supervisor.project ? [supervisor.project] : [];

  if (projects.length === 0) {
    return { response: NextResponse.json({ message: 'No department is assigned to this supervisor.' }, { status: 403 }) };
  }

  return { supervisor, projects };
}

interface FieldWorkerRouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: FieldWorkerRouteContext) {
  const auth = await requireSupervisorManager();
  if ('response' in auth) return auth.response;

  try {
    const input = updateFieldWorkerSchema.parse(await request.json());
    if (input.supervisorId && input.supervisorId !== auth.supervisor.id) {
      return NextResponse.json({ message: 'You can only assign field workers to yourself.' }, { status: 403 });
    }

    if (!auth.projects.includes(input.project)) {
      return NextResponse.json({ message: 'You can only manage field workers in your assigned departments.' }, { status: 422 });
    }

    const worker = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: 'field_worker',
        supervisorId: auth.supervisor.id,
        project: { in: auth.projects },
      },
      select: { id: true, phoneNumber: true },
    });

    if (!worker) {
      return NextResponse.json({ message: 'Field worker not found.' }, { status: 404 });
    }

    const orConditions: Prisma.UserWhereInput[] = [
      ...cnicVariants(input.cnic).map((cnic) => ({ cnic })),
      ...cnicVariants(input.cnic).map((cnic) => ({ email: `${cnic}@field.saiban.local` })),
    ];
    const existingUser = orConditions.length
      ? await prisma.user.findFirst({
        where: { id: { not: params.id }, OR: orConditions },
        select: { id: true },
      })
      : null;

    if (existingUser) {
      return NextResponse.json({ message: 'A field worker with this CNIC already exists.' }, { status: 409 });
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
    const updatedWorker = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: input.name,
        email: `${input.cnic || worker.phoneNumber}@field.saiban.local`,
        cnic: input.cnic || null,
        address: input.address || null,
        reference: input.reference || null,
        project: input.project,
        supervisorId: auth.supervisor.id,
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

    await logSystemAudit({
      action: 'field_worker_updated_by_supervisor',
      entityType: 'field_worker',
      entityId: updatedWorker.id,
      entityLabel: updatedWorker.name ?? updatedWorker.fieldWorkerId ?? updatedWorker.phoneNumber,
      actorId: auth.supervisor.id,
      details: {
        project: updatedWorker.project,
        supervisorId: updatedWorker.supervisorId,
        passwordChanged: Boolean(passwordHash),
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
  const auth = await requireSupervisorManager();
  if ('response' in auth) return auth.response;

  try {
    const worker = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: 'field_worker',
        supervisorId: auth.supervisor.id,
        project: { in: auth.projects },
      },
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
    await logSystemAudit({
      action: 'field_worker_deleted_by_supervisor',
      entityType: 'field_worker',
      entityId: params.id,
      actorId: auth.supervisor.id,
    });
    return NextResponse.json({ message: 'Field worker deleted successfully.' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: 'Field worker not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete field worker' }, { status: 500 });
  }
}
