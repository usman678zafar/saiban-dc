import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cnicVariants, formatCnic, isValidCnic, normalizePakistanMobile } from '@/lib/contact-format';
import { logSystemAudit } from '@/lib/system-audit';

const createFieldWorkerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().transform(normalizePakistanMobile).refine((value) => /^03\d{9}$/.test(value), {
    message: 'Phone number must use the format 03332101476',
  }),
  cnic: z.string().optional().transform((value) => (value ? formatCnic(value) : '')).refine((value) => value.length === 0 || isValidCnic(value), {
    message: 'CNIC must use the format 42101-0536155-7',
  }),
  address: z.string().trim().optional().default(''),
  reference: z.string().trim().optional().default(''),
  project: z.string().trim().min(1, 'Department is required'),
  supervisorId: z.string().uuid().optional(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
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

async function generateFieldWorkerId() {
  const latestWorker = await prisma.user.findFirst({
    where: {
      role: 'field_worker',
      fieldWorkerId: { startsWith: 'FW-' },
    },
    orderBy: { fieldWorkerId: 'desc' },
    select: { fieldWorkerId: true },
  });

  const latestNumber = Number(latestWorker?.fieldWorkerId?.replace('FW-', '') ?? '0');
  return `FW-${String(Number.isFinite(latestNumber) ? latestNumber + 1 : 1).padStart(6, '0')}`;
}

function isFieldWorkerIdCollision(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('fieldWorkerId')
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireSupervisorManager();
  if ('response' in auth) return auth.response;

  try {
    const input = createFieldWorkerSchema.parse(await request.json());
    if (input.supervisorId && input.supervisorId !== auth.supervisor.id) {
      return NextResponse.json({ message: 'You can only assign field workers to yourself.' }, { status: 403 });
    }

    if (!auth.projects.includes(input.project)) {
      return NextResponse.json({ message: 'You can only add field workers in your assigned departments.' }, { status: 422 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: input.phoneNumber },
          ...cnicVariants(input.cnic).map((cnic) => ({ cnic })),
          ...cnicVariants(input.cnic).map((cnic) => ({ email: `${cnic}@field.saiban.local` })),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'A field worker with this phone number or CNIC already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    let user = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        user = await prisma.user.create({
          data: {
            name: input.name,
            email: `${input.cnic || input.phoneNumber}@field.saiban.local`,
            phoneNumber: input.phoneNumber,
            cnic: input.cnic || null,
            fieldWorkerId: await generateFieldWorkerId(),
            address: input.address || null,
            reference: input.reference || null,
            project: input.project,
            supervisorId: auth.supervisor.id,
            passwordHash,
            role: 'field_worker',
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
            role: true,
          },
        });
        break;
      } catch (error) {
        if (isFieldWorkerIdCollision(error) && attempt < 4) continue;
        throw error;
      }
    }

    if (!user) {
      return NextResponse.json({ message: 'Unable to generate field worker ID. Please try again.' }, { status: 500 });
    }

    await logSystemAudit({
      action: 'field_worker_created_by_supervisor',
      entityType: 'field_worker',
      entityId: user.id,
      entityLabel: user.name ?? user.fieldWorkerId ?? user.phoneNumber,
      actorId: auth.supervisor.id,
      details: {
        fieldWorkerId: user.fieldWorkerId,
        project: user.project,
        supervisorId: user.supervisorId,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create field worker' }, { status: 500 });
  }
}
