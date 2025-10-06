import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  validateAppointmentPayload,
  parseDateOnly,
  formatAppointmentDate,
} from '@/lib/validation/appointment';
import { appointmentPatientSelect, serializeAppointmentRecord } from '@/lib/appointments';

const DEFAULT_PAGE_SIZE = 10;

function parsePagination(searchParams) {
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const sizeParam = Number.parseInt(searchParams.get('pageSize') ?? `${DEFAULT_PAGE_SIZE}`, 10);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(sizeParam) && sizeParam > 0 && sizeParam <= 50 ? sizeParam : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

function parseDateParam(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return { ok: true, value: null, provided: false };
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: true, value: null, provided: false };
  }

  const parsed = parseDateOnly(trimmed);
  if (!parsed) {
    return { ok: false, value: null, provided: true };
  }

  return { ok: true, value: parsed.date, provided: true };
}

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parsePagination(searchParams);
    const query = searchParams.get('query')?.trim() ?? '';

    const dateParam = parseDateParam(searchParams.get('date'));
    if (!dateParam.ok) {
      return NextResponse.json({ message: 'Invalid date filter. Use YYYY-MM-DD format.' }, { status: 400 });
    }

    const fromParam = parseDateParam(searchParams.get('from'));
    if (!fromParam.ok) {
      return NextResponse.json({ message: 'Invalid from date. Use YYYY-MM-DD format.' }, { status: 400 });
    }

    const toParam = parseDateParam(searchParams.get('to'));
    if (!toParam.ok) {
      return NextResponse.json({ message: 'Invalid to date. Use YYYY-MM-DD format.' }, { status: 400 });
    }

    const filters = [];

    if (query) {
      filters.push({
        OR: [
          { patient: { name: { contains: query } } },
          { patient: { phone: { contains: query } } },
          { notes: { contains: query } },
        ],
      });
    }

    if (dateParam.value) {
      filters.push({ date: dateParam.value });
    } else {
      if (fromParam.value) {
        filters.push({ date: { gte: fromParam.value } });
      }
      if (toParam.value) {
        filters.push({ date: { lte: toParam.value } });
      }
    }

    const where = filters.length > 0 ? { AND: filters } : undefined;

    const [totalCount, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          patient: {
            select: appointmentPatientSelect,
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const metaDate = dateParam.provided && dateParam.value ? formatAppointmentDate(dateParam.value) : null;
    const metaFrom = fromParam.provided && fromParam.value ? formatAppointmentDate(fromParam.value) : null;
    const metaTo = toParam.provided && toParam.value ? formatAppointmentDate(toParam.value) : null;

    return NextResponse.json({
      data: appointments.map(serializeAppointmentRecord),
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
        query,
        date: metaDate,
        from: metaFrom,
        to: metaTo,
      },
    });
  } catch (error) {
    console.error('Failed to fetch appointments', error);
    return NextResponse.json({ message: 'Unable to fetch appointments.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validation = validateAppointmentPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const created = await prisma.appointment.create({
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

    return NextResponse.json({ data: serializeAppointmentRecord(created) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create appointment', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Selected patient does not exist.' }, { status: 400 });
      }
    }

    return NextResponse.json({ message: 'Unable to create appointment.' }, { status: 500 });
  }
}
