import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const createAdminSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Valid email is required').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  if (session.user.role !== 'super_admin') {
    return { response: NextResponse.json({ message: 'Super admin access required' }, { status: 403 }) };
  }

  return { session };
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ('response' in auth) return auth.response;

  try {
    const input = createAdminSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: 'A user with this email already exists.' }, { status: 409 });
    }

    const admin = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 10),
        passwordChangeRequired: true,
        role: UserRole.admin,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create admin' }, { status: 500 });
  }
}
