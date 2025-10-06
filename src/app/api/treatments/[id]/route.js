import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateTreatmentPayload } from '@/lib/validation/treatment';

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request, { params }) {
  const treatmentId = parseId(params?.id);

  if (!treatmentId) {
    return NextResponse.json({ message: 'Invalid treatment id.' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const validation = validateTreatmentPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const updated = await prisma.treatment.update({
      where: { id: treatmentId },
      data: {
        code: validation.values.code,
        name: validation.values.name,
        price: new Prisma.Decimal(validation.values.price),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Failed to update treatment', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Treatment not found.' }, { status: 404 });
      }

      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
        return NextResponse.json({ message: `A treatment with that ${target} already exists.` }, { status: 409 });
      }
    }

    return NextResponse.json({ message: 'Unable to update treatment.' }, { status: 500 });
  }
}

