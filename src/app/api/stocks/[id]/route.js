import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateStockPayload } from '@/lib/validation/stock';

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request, { params }) {
  const stockId = parseId(params?.id);

  if (!stockId) {
    return NextResponse.json({ message: 'Invalid stock id.' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const validation = validateStockPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const updated = await prisma.medicineStock.update({
      where: { id: stockId },
      data: {
        medicineTypeId: validation.values.medicineTypeId,
        code: validation.values.code,
        name: validation.values.name,
        quantity: validation.values.quantity,
        incomingPrice: new Prisma.Decimal(validation.values.incomingPrice),
        sellingPrice: new Prisma.Decimal(validation.values.sellingPrice),
      },
      include: {
        type: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Failed to update stock item', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Stock item not found.' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'A stock item with that code already exists.' }, { status: 409 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Please select a valid medicine type.' }, { status: 400 });
      }
    }

    return NextResponse.json({ message: 'Unable to update stock item.' }, { status: 500 });
  }
}
