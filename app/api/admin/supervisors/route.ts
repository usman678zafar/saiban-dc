import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isFieldWorkerProject, fieldWorkerProjects } from '@/lib/field-workers';
import { prisma } from '@/lib/prisma';

const createSupervisorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Valid email is required').transform((value) => value.toLowerCase()),
  phoneNumber: z.string().trim().optional().default(''),
  project: z.string().refine(isFieldWorkerProject, 'Project is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  try {
    const input = createSupervisorSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: {
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

    const supervisor = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber || null,
        project: input.project,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: UserRole.supervisor,
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

    return NextResponse.json(supervisor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create supervisor' }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ projects: fieldWorkerProjects });
}
