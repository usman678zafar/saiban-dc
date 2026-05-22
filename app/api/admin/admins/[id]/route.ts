import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const updateAdminSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  password: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .refine((value) => value.length === 0 || value.length >= 8, { message: 'Password must be at least 8 characters' }),
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ('response' in auth) return auth.response;

  try {
    const input = updateAdminSchema.parse(await request.json());
    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
    const admin = await prisma.user.update({
      where: { id: params.id, role: UserRole.admin },
      data: {
        name: input.name,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(admin);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update admin' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ('response' in auth) return auth.response;

  const admin = await prisma.user.findFirst({
    where: { id: params.id, role: UserRole.admin },
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

  if (!admin) {
    return NextResponse.json({ message: 'Admin not found.' }, { status: 404 });
  }

  if (admin._count.updatedApps > 0 || admin._count.auditLogs > 0) {
    return NextResponse.json({ message: 'This admin has activity history and cannot be deleted.' }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ message: 'Admin deleted successfully.' });
}
