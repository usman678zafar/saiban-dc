import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const createFieldWorkerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().transform(digitsOnly).refine((value) => value.length >= 10, {
    message: 'Phone number must contain at least 10 digits',
  }),
  cnic: z.string().transform(digitsOnly).refine((value) => value.length === 13, {
    message: 'CNIC must contain 13 digits',
  }),
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
    const body = await request.json();
    const input = createFieldWorkerSchema.parse(body);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: input.phoneNumber },
          { cnic: input.cnic },
          { email: `${input.cnic}@field.saiban.local` },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'A field worker with this phone number or CNIC already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: `${input.cnic}@field.saiban.local`,
        phoneNumber: input.phoneNumber,
        cnic: input.cnic,
        passwordHash,
        role: 'field_worker',
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        cnic: true,
        role: true,
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
