import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateSessionPayload } from '@/lib/validation/session';

const DEFAULT_PAGE_SIZE = 10;

function parsePositiveInt(value) {
  const numeric = typeof value === 'number' ? value : Number.parseInt(`${value ?? ''}`.trim(), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}


function parsePagination(searchParams) {
  const pageParam = parsePositiveInt(searchParams.get('page')) ?? 1;
  const sizeParam = parsePositiveInt(searchParams.get('pageSize')) ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(sizeParam, 1), 50);
  return { page: pageParam, pageSize };
}

function buildFilter(query) {
  if (!query) {
    return undefined;
  }

  const numericId = parsePositiveInt(query);

  return {
    OR: [
      numericId ? { id: numericId } : null,
      { description: { contains: query } },
      { patient: { name: { contains: query } } },
    ].filter(Boolean),
  };
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
          sellingPrice: decimalToNumber(item.medicine.sellingPrice),
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
    patient: session.patient
      ? {
          id: session.patient.id,
          name: session.patient.name,
          phone: session.patient.phone,
          email: session.patient.email,
        }
      : null,
    patientId: session.patientId,
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

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parsePagination(searchParams);
    const query = searchParams.get('query')?.trim() ?? '';

    const where = buildFilter(query);

    const [totalCount, sessions] = await Promise.all([
      prisma.session.count({ where }),
      prisma.session.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          patient: true,
          items: {
            include: {
              treatment: true,
            },
          },
          medicineItems: {
            include: {
              medicine: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return NextResponse.json({
      data: sessions.map(serializeSession),
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
        query,
      },
    });
  } catch (error) {
    console.error('Failed to fetch sessions', error);
    return NextResponse.json({ message: 'Unable to fetch billing sessions.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validation = validateSessionPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const { patientId, date, description, discount, total, items, medicines } = validation.values;

    const created = await prisma.session.create({
      data: {
        patientId,
        date: new Date(date ?? Date.now()),
        description: description || null,
        discount: discount ? new Prisma.Decimal(discount) : new Prisma.Decimal(0),
        total: new Prisma.Decimal(total),
        items: {
          create: items.map((item) => ({
            treatmentId: item.treatmentId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            discount: item.discount ? new Prisma.Decimal(item.discount) : null,
            total: new Prisma.Decimal(item.total),
          })),
        },
        medicineItems: {
          create: medicines.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            discount: item.discount ? new Prisma.Decimal(item.discount) : null,
            total: new Prisma.Decimal(item.total),
          })),
        },
      },
      include: {
        patient: true,
        items: {
          include: {
            treatment: true,
          },
        },
        medicineItems: {
          include: {
            medicine: true,
          },
        },
      },
    });

    return NextResponse.json({ data: serializeSession(created) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create billing session', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Please select a valid patient and treatments.' }, { status: 400 });
      }
    }

    return NextResponse.json({ message: 'Unable to create billing session.' }, { status: 500 });
  }
}
