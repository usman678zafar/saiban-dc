import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

function normalizePakistanMobile(value: string) {
  const digits = digitsOnly(value);
  if (digits.startsWith('0092') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits;
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phoneNumber: z.string().transform(normalizePakistanMobile).refine((value) => /^03\d{9}$/.test(value), {
    message: 'Enter a valid Pakistan mobile number, for example 03XX-XXXXXXX.',
  }),
  cnic: z.string().transform(digitsOnly).refine((value) => value.length === 0 || value.length === 13, {
    message: 'CNIC must contain 13 digits',
  }).optional().default(''),
  address: z.string().trim().optional().default(''),
});

async function generateFieldWorkerId() {
  const latestWorker = await prisma.user.findFirst({
    where: { role: 'field_worker', fieldWorkerId: { startsWith: 'FW-' } },
    orderBy: { fieldWorkerId: 'desc' },
    select: { fieldWorkerId: true },
  });

  const latestNumber = Number(latestWorker?.fieldWorkerId?.replace('FW-', '') ?? '0');
  return `FW-${String(Number.isFinite(latestNumber) ? latestNumber + 1 : 1).padStart(6, '0')}`;
}

function isFieldWorkerIdCollision(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes('fieldWorkerId')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: input.phoneNumber },
          ...(input.cnic ? [{ cnic: input.cnic }] : []),
        ],
      },
      select: { id: true, phoneNumber: true, cnic: true },
    });

    if (existing) {
      const field = existing.phoneNumber === input.phoneNumber ? 'phone number' : 'CNIC';
      return NextResponse.json(
        { message: `An account with this ${field} already exists.` },
        { status: 409 },
      );
    }

    const password = input.phoneNumber.slice(-4);
    const passwordHash = await bcrypt.hash(password, 10);
    const email = `${input.phoneNumber}@public.saiban.local`;

    let user = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        user = await prisma.user.create({
          data: {
            name: input.name,
            email,
            phoneNumber: input.phoneNumber,
            cnic: input.cnic || null,
            address: input.address || null,
            fieldWorkerId: await generateFieldWorkerId(),
            passwordHash,
            role: 'field_worker',
            selfRegistered: true,
            project: 'Self Registered',
          },
          select: {
            id: true,
            fieldWorkerId: true,
            name: true,
            phoneNumber: true,
          },
        });
        break;
      } catch (error) {
        if (isFieldWorkerIdCollision(error) && attempt < 4) continue;
        throw error;
      }
    }

    if (!user) {
      return NextResponse.json({ message: 'Unable to generate ID. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ fieldWorkerId: user.fieldWorkerId, name: user.name }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ message: 'An account with this information already exists.' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}

