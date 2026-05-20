import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const digitsOnly = (value: string) => value.replace(/\D/g, '');
const reviewerEmailForPhone = (phoneNumber: string) => `${phoneNumber.replace(/[^a-zA-Z0-9]+/g, '')}@reviewer.saiban.local`;

const createReviewerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().trim().min(1, 'Phone number is required').refine((value) => digitsOnly(value).length >= 4, {
    message: 'Phone number must contain at least 4 digits',
  }),
  cnic: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
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
    const input = createReviewerSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: reviewerEmailForPhone(input.phoneNumber) },
          { phoneNumber: input.phoneNumber },
          ...(input.cnic ? [{ cnic: input.cnic }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: 'A user with this phone number or CNIC already exists.' }, { status: 409 });
    }

    const password = digitsOnly(input.phoneNumber).slice(-4);
    const reviewer = await prisma.user.create({
      data: {
        name: input.name,
        email: reviewerEmailForPhone(input.phoneNumber),
        phoneNumber: input.phoneNumber,
        cnic: input.cnic || null,
        address: input.address || null,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.reviewer,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        cnic: true,
        address: true,
        createdAt: true,
      },
    });

    return NextResponse.json(reviewer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create reviewer' }, { status: 500 });
  }
}
