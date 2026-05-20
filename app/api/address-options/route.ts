import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function normalizeOptionName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const options = await prisma.addressOption.findMany({
    orderBy: [{ province: 'asc' }, { district: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json(options);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  const body = await request.json();
  const type = body.type === 'district' || body.type === 'tehsil' ? body.type : '';
  const province = normalizeOptionName(body.province);
  const district = normalizeOptionName(body.district) || null;
  const name = normalizeOptionName(body.name);

  if (!type || !province || !name) {
    return NextResponse.json({ message: 'Missing address option details' }, { status: 400 });
  }

  if (type === 'tehsil' && !district) {
    return NextResponse.json({ message: 'District is required for tehsil options' }, { status: 400 });
  }

  const existing = await prisma.addressOption.findFirst({
    where: {
      type,
      province,
      district,
      name,
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const option = await prisma.addressOption.create({
    data: {
      type,
      province,
      district,
      name,
      createdById: user?.id,
    },
  });

  return NextResponse.json(option);
}

