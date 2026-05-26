import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSessionVersionUpdateData } from '@/lib/session-version';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
}).refine((value) => value.currentPassword !== value.newPassword, {
  path: ['newPassword'],
  message: 'New password must be different from the current password.',
});

const passwordChangeRoles = ['admin', 'super_admin', 'reviewer', 'supervisor'];

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!passwordChangeRoles.includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'This account does not require this password flow.' }, { status: 403 });
  }

  try {
    const input = changePasswordSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true, role: true },
    });

    if (!user || !passwordChangeRoles.includes(user.role)) {
      return NextResponse.json({ message: 'Account not found.' }, { status: 404 });
    }

    const isCurrentPasswordValid = await compare(input.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(input.newPassword, 10),
        passwordChangeRequired: false,
        ...(await getSessionVersionUpdateData()),
      },
      select: { id: true },
    });

    return NextResponse.json({ message: 'Password updated successfully. Please sign in again.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update password' }, { status: 500 });
  }
}
