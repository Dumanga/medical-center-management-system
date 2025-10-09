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

    if (isPaid === true && existing.isPaid !== true) {
      await prisma.$transaction(async (tx) => {
        // 1) Mark session as paid
        await tx.$executeRawUnsafe('UPDATE `Session` SET `isPaid` = 1 WHERE `id` = ? LIMIT 1', id);

        // 2) Award loyalty points
        const totalNumber = decimalToNumber(existing.total) ?? 0;
        const pointsCentsToAdd = Math.round(totalNumber);
        if (pointsCentsToAdd > 0 && existing.patientId) {
          await tx.patient.update({
            where: { id: existing.patientId },
            data: { loyaltyPoints: { increment: pointsCentsToAdd } },
          });
        }

        // 3) Deduct medicine stock quantities used in this session (if any)
        const medItems = await tx.sessionMedicine.findMany({
          where: { sessionId: id },
          select: { medicineId: true, quantity: true },
        });
        if (medItems.length > 0) {
          const totals = new Map();
          for (const item of medItems) {
            const key = item.medicineId;
            totals.set(key, (totals.get(key) || 0) + (item.quantity || 0));
          }
          const medicineIds = Array.from(totals.keys());
          if (medicineIds.length > 0) {
            const stocks = await tx.medicineStock.findMany({
              where: { id: { in: medicineIds } },
              select: { id: true, quantity: true },
            });
            for (const stock of stocks) {
              const sold = totals.get(stock.id) || 0;
              if (sold > 0) {
                const decrement = Math.min(stock.quantity || 0, sold);
                if (decrement > 0) {
                  await tx.medicineStock.update({
                    where: { id: stock.id },
                    data: { quantity: { decrement } },
                  });
                }
              }
            }
          }
        }
      });
    } else {
      // If not transitioning to paid, just set the flag to requested value
      await prisma.$executeRawUnsafe('UPDATE `Session` SET `isPaid` = ? WHERE `id` = ? LIMIT 1', isPaid ? 1 : 0, id);
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
