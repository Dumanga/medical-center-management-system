import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function parsePositiveInt(value) {
  const numeric = typeof value === 'number' ? value : Number.parseInt(`${value ?? ''}`.trim(), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function decimalToNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

function serializeSession(session) {
  const items = session.items?.map((item) => ({
    id: item.id,
    treatmentId: item.treatmentId,
    treatment: item.treatment
      ? {
          id: item.treatment.id,
          name: item.treatment.name,
          code: item.treatment.code,
        }
      : null,
    quantity: item.quantity,
    unitPrice: decimalToNumber(item.unitPrice),
    discount: decimalToNumber(item.discount),
    total: decimalToNumber(item.total),
  })) ?? [];

  const medicineItems = session.medicineItems?.map((item) => ({
    id: item.id,
    medicineId: item.medicineId,
    medicine: item.medicine
      ? {
          id: item.medicine.id,
          name: item.medicine.name,
          code: item.medicine.code,
        }
      : null,
    quantity: item.quantity,
    unitPrice: decimalToNumber(item.unitPrice),
    discount: decimalToNumber(item.discount),
    total: decimalToNumber(item.total),
  })) ?? [];

  const itemsTotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const medicinesTotal = medicineItems.reduce((sum, item) => sum + (item.total ?? 0), 0);

  return {
    id: session.id,
    isPaid: Boolean(session.isPaid),
    patientId: session.patientId,
    patient: session.patient
      ? {
          id: session.patient.id,
          name: session.patient.name,
          phone: session.patient.phone,
          email: session.patient.email,
        }
      : null,
    date: session.date?.toISOString?.() ?? null,
    description: session.description ?? '',
    discount: decimalToNumber(session.discount) ?? 0,
    total: decimalToNumber(session.total) ?? 0,
    items,
    medicineItems,
    itemsTotal,
    medicinesTotal,
    createdAt: session.createdAt?.toISOString?.() ?? null,
    updatedAt: session.updatedAt?.toISOString?.() ?? null,
  };
}

export async function PATCH(_request, { params }) {
  try {
    const id = parsePositiveInt(params?.id);
    if (!id) {
      return NextResponse.json({ message: 'Invalid session id.' }, { status: 400 });
    }

    const payload = await _request.json().catch(() => ({}));
    const isPaid = typeof payload?.isPaid === 'boolean' ? payload.isPaid : null;
    if (isPaid === null) {
      return NextResponse.json({ message: 'isPaid boolean is required.' }, { status: 400 });
    }

    // Ensure session exists first
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
    }

    // Award loyalty points only when transitioning from unpaid -> paid
    let pointsCentsToAdd = 0;
    if (isPaid === true && existing.isPaid !== true) {
      const totalNumber = decimalToNumber(existing.total) ?? 0;
      // points = round((total / 100), 2). Store as cents to keep precision in Int column
      // This simplifies to rounding the total currency amount to nearest integer for cent-points storage
      pointsCentsToAdd = Math.round(totalNumber);
    }

    // Update session isPaid flag
    await prisma.$executeRawUnsafe('UPDATE `Session` SET `isPaid` = ? WHERE `id` = ? LIMIT 1', isPaid ? 1 : 0, id);

    // Increment patient loyalty points (stored as integer cent-points)
    if (pointsCentsToAdd > 0 && existing.patientId) {
      await prisma.patient.update({
        where: { id: existing.patientId },
        data: { loyaltyPoints: { increment: pointsCentsToAdd } },
      });
    }

    // Re-fetch related data for response (Prisma client might not expose isPaid yet)
    const refreshed = await prisma.session.findUnique({
      where: { id },
      include: {
        patient: true,
        items: { include: { treatment: true } },
        medicineItems: { include: { medicine: true } },
      },
    });

    const serialized = serializeSession(refreshed);
    // Force return the updated status in response
    serialized.isPaid = isPaid;
    return NextResponse.json({ data: serialized });
  } catch (error) {
    console.error('Failed to update session status', error);
    return NextResponse.json({ message: 'Unable to update session.' }, { status: 500 });
  }
}
