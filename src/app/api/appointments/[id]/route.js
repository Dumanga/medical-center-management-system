import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateAppointmentPayload } from '@/lib/validation/appointment';
import { appointmentPatientSelect, serializeAppointmentRecord } from '@/lib/appointments';

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request, { params }) {
  const appointmentId = parseId(params?.id);

  if (!appointmentId) {
    return NextResponse.json({ message: 'Invalid appointment id.' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const validation = validateAppointmentPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        patientId: validation.values.patientId,
        date: validation.values.date,
        time: validation.values.time,
        notes: validation.values.notes,
      },
      include: {
        patient: {
          select: appointmentPatientSelect,
        },
      },
    });

    return NextResponse.json({ data: serializeAppointmentRecord(updated) });
  } catch (error) {
    console.error(`Failed to update appointment ${appointmentId}`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Selected patient does not exist.' }, { status: 400 });
      }
    }

    return NextResponse.json({ message: 'Unable to update appointment.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const appointmentId = parseId(params?.id);

  if (!appointmentId) {
    return NextResponse.json({ message: 'Invalid appointment id.' }, { status: 400 });
  }

  try {
    await prisma.appointment.delete({ where: { id: appointmentId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete appointment ${appointmentId}`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
      }
    }

    return NextResponse.json({ message: 'Unable to delete appointment.' }, { status: 500 });
  }
}
