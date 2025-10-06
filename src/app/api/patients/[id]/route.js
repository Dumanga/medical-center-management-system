import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validatePatientPayload } from '@/lib/validation/patient';

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request, { params }) {
  const patientId = parseId(params?.id);

  if (!patientId) {
    return NextResponse.json({ message: 'Invalid patient id.' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const validation = validatePatientPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: { ...validation.values },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Failed to update patient', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Patient not found.' }, { status: 404 });
      }

      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
        return NextResponse.json({ message: `A patient with that ${target} already exists.` }, { status: 409 });
      }
    }

    return NextResponse.json({ message: 'Unable to update patient.' }, { status: 500 });
  }
}
