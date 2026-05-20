import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isFieldWorkerProject } from '@/lib/field-workers';
import { prisma } from '@/lib/prisma';

const updateSupervisorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Valid email is required').transform((value) => value.toLowerCase()),
  phoneNumber: z.string().trim().optional().default(''),
  project: z.string().refine(isFieldWorkerProject, 'Project is required'),
  password: z.string().optional().default('').refine((value) => value.length === 0 || value.length >= 4, 'Password must be at least 4 characters'),
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
    const input = updateSupervisorSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: params.id },
        OR: [
          { email: input.email },
          ...(input.phoneNumber ? [{ phoneNumber: input.phoneNumber }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: 'A user with this email or phone already exists.' }, { status: 409 });
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
    const supervisor = await prisma.user.update({
      where: { id: params.id, role: UserRole.supervisor },
      data: {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber || null,
        project: input.project,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
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
        },
      },
    },
  });

  if (!supervisor) {
    return NextResponse.json({ message: 'Supervisor not found.' }, { status: 404 });
  }

  if (supervisor._count.updatedApps > 0 || supervisor._count.auditLogs > 0) {
    return NextResponse.json({ message: 'This supervisor has review history and cannot be deleted.' }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ message: 'Supervisor deleted successfully.' });
}
