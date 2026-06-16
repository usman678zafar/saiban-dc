import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidDistrictForProvince, isValidProvince, isValidTehsilForDistrict } from '@/lib/address-utils';

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
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
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

  if (!isValidProvince(province)) {
    return NextResponse.json({ message: 'Selected province is invalid' }, { status: 400 });
  }

  if (type === 'tehsil' && !district) {
    return NextResponse.json({ message: 'District is required for tehsil options' }, { status: 400 });
  }

  if (type === 'district' && isValidDistrictForProvince(province, name)) {
    return NextResponse.json({ message: 'This district already exists in the default list' }, { status: 409 });
  }

  if (type === 'tehsil' && district) {
    const districtExists = isValidDistrictForProvince(province, district) || await prisma.addressOption.findFirst({
      where: {
        type: 'district',
        province,
        district: null,
        name: district,
      },
      select: { id: true },
    });

    if (!districtExists) {
      return NextResponse.json({ message: 'Add the district before adding tehsils under it' }, { status: 400 });
    }

    const tehsilExistsInDataset = isValidDistrictForProvince(province, district)
      && isValidTehsilForDistrict(province, district, name);

    if (tehsilExistsInDataset) {
      return NextResponse.json({ message: 'This tehsil already exists in the default list' }, { status: 409 });
    }
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

