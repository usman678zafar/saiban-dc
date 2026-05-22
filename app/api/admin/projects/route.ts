import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fieldWorkerProjects } from '@/lib/field-workers';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(80, 'Department name is too long'),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) return { response: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) };
  return { session };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  try {
    const input = projectSchema.parse(await request.json());
    if (fieldWorkerProjects.includes(input.name as (typeof fieldWorkerProjects)[number])) {
      return NextResponse.json({ message: 'This department already exists as a default department.' }, { status: 409 });
    }

    const project = await prisma.projectOption.create({
      data: { name: input.name },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'This department already exists.' }, { status: 409 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to add department' }, { status: 500 });
  }
}




