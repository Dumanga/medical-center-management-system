import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateMedicineTypePayload } from '@/lib/validation/stock';

function parseId(value) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request, { params }) {
  const id = parseId(params?.id);

  if (!id) {
    return NextResponse.json({ message: 'Invalid medicine type id.' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const validation = validateMedicineTypePayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const updated = await prisma.medicineType.update({
      where: { id },
      data: {
        name: validation.values.name,
      },
      include: {
        _count: { select: { stocks: true } },
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        stockCount: updated._count?.stocks ?? 0,
        createdAt: updated.createdAt?.toISOString ? updated.createdAt.toISOString() : null,
        updatedAt: updated.updatedAt?.toISOString ? updated.updatedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error(`Failed to update medicine type ${id}`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'A medicine type with that name already exists.' }, { status: 409 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Medicine type not found.' }, { status: 404 });
      }
    }

    return NextResponse.json({ message: 'Unable to update medicine type.' }, { status: 500 });
  }
}