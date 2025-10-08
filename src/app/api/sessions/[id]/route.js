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

    const updated = await prisma.session.update({
      where: { id },
      data: { isPaid },
      include: {
        patient: true,
        items: { include: { treatment: true } },
        medicineItems: { include: { medicine: true } },
      },
    });

    return NextResponse.json({ data: serializeSession(updated) });
  } catch (error) {
    console.error('Failed to update session status', error);
    return NextResponse.json({ message: 'Unable to update session.' }, { status: 500 });
  }
}

