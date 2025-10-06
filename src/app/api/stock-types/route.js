import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateMedicineTypePayload } from '@/lib/validation/stock';

export async function GET() {
  try {
    const types = await prisma.medicineType.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        _count: { select: { stocks: true } },
      },
    });

    const data = types.map((type) => ({
      id: type.id,
      name: type.name,
      stockCount: type._count?.stocks ?? 0,
      createdAt: type.createdAt?.toISOString ? type.createdAt.toISOString() : null,
      updatedAt: type.updatedAt?.toISOString ? type.updatedAt.toISOString() : null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch medicine types', error);
    return NextResponse.json({ message: 'Unable to fetch medicine types.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validation = validateMedicineTypePayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const created = await prisma.medicineType.create({
      data: {
        name: validation.values.name,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create medicine type', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'A medicine type with that name already exists.' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Unable to create medicine type.' }, { status: 500 });
  }
}
