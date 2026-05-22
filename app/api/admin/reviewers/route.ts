import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cnicVariants, digitsOnly, formatCnic, isValidCnic, normalizePakistanMobile } from '@/lib/contact-format';
const reviewerEmailForPhone = (phoneNumber: string) => `${phoneNumber.replace(/[^a-zA-Z0-9]+/g, '')}@reviewer.saiban.local`;

const createReviewerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().transform(normalizePakistanMobile).refine((value) => /^03\d{9}$/.test(value), {
    message: 'Phone number must use the format 03332101476',
  }),
  cnic: z.string().transform((value) => (value ? formatCnic(value) : '')).refine((value) => value.length === 0 || isValidCnic(value), {
    message: 'CNIC must use the format 42101-0536155-7',
  }).optional().default(''),
  address: z.string().trim().optional().default(''),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  try {
    const input = createReviewerSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: reviewerEmailForPhone(input.phoneNumber) },
          { phoneNumber: input.phoneNumber },
          ...cnicVariants(input.cnic).map((cnic) => ({ cnic })),
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
