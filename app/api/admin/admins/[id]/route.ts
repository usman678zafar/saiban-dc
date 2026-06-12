import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSessionVersionUpdateData } from '@/lib/session-version';
import { logSystemAudit } from '@/lib/system-audit';

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
    const sessionVersionUpdate = passwordHash ? await getSessionVersionUpdateData() : {};
    const account = await prisma.user.update({
      where: { id: params.id, role: { in: [UserRole.admin, UserRole.viewer] } },
      data: {
        name: input.name,
        ...(passwordHash ? { passwordHash } : {}),
        ...(passwordHash ? { passwordChangeRequired: false } : {}),
        ...sessionVersionUpdate,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await logSystemAudit({
      action: `${account.role}_updated`,
      entityType: account.role,
      entityId: account.id,
      entityLabel: account.name ?? account.email,
      actorId: auth.session.user?.id,
      details: {
        name: account.name,
        email: account.email,
        role: account.role,
        passwordChanged: Boolean(passwordHash),
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update account' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ('response' in auth) return auth.response;

  const account = await prisma.user.findFirst({
    where: { id: params.id, role: { in: [UserRole.admin, UserRole.viewer] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: {
          updatedApps: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ message: 'Account not found.' }, { status: 404 });
  }

  if (account._count.updatedApps > 0 || account._count.auditLogs > 0) {
    return NextResponse.json({ message: 'This account has activity history and cannot be deleted.' }, { status: 409 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  await logSystemAudit({
    action: `${account.role}_deleted`,
    entityType: account.role,
    entityId: account.id,
    entityLabel: account.name ?? account.email,
    actorId: auth.session.user?.id,
  });
  return NextResponse.json({ message: 'Account deleted successfully.' });
}
