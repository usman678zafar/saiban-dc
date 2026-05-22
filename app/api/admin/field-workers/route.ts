import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getFieldWorkerProjectOptions } from '@/lib/project-options';
import { prisma } from '@/lib/prisma';
import { cnicVariants, formatCnic, isValidCnic, normalizePakistanMobile } from '@/lib/contact-format';

const createFieldWorkerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().transform(normalizePakistanMobile).refine((value) => /^03\d{9}$/.test(value), {
    message: 'Phone number must use the format 03332101476',
  }),
  cnic: z.string().transform(formatCnic).refine(isValidCnic, {
    message: 'CNIC must use the format 42101-0536155-7',
  }),
  address: z.string().trim().min(1, 'Address is required'),
  reference: z.string().trim().optional().default(''),
  project: z.string().trim().min(1, 'Department is required'),
  supervisorId: z.string().uuid('Supervisor is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = createFieldWorkerSchema.parse(body);
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
            email: `${input.cnic}@field.saiban.local`,
            phoneNumber: input.phoneNumber,
            cnic: input.cnic,
            fieldWorkerId: await generateFieldWorkerId(),
            address: input.address,
            reference: input.reference || null,
            project: input.project,
            supervisorId: input.supervisorId,
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
        if (isFieldWorkerIdCollision(error) && attempt < 4) {
          continue;
        }

        throw error;
      }
    }

    if (!user) {
      return NextResponse.json({ message: 'Unable to generate field worker ID. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create field worker' }, { status: 500 });
  }
}





