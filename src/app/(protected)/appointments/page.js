import prisma from '@/lib/prisma';
import AppointmentsView from '@/components/appointments-view';
import { parseDateOnly, formatAppointmentDate } from '@/lib/validation/appointment';
import { appointmentPatientSelect, serializeAppointmentRecord } from '@/lib/appointments';

export const metadata = {
  title: 'Appointments | Medical Center Management System',
};

const PAGE_SIZE = 10;

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateFilter(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const parsed = parseDateOnly(value.trim());
  return parsed ? parsed.date : null;
}

function buildWhere({ query, date, from, to }) {
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

  if (date) {
    filters.push({ date });
  } else {
    if (from) {
      filters.push({ date: { gte: from } });
    }
    if (to) {
      filters.push({ date: { lte: to } });
    }
  }

  return filters.length > 0 ? { AND: filters } : undefined;
}

async function loadAppointments(searchParams) {
  const page = parseNumber(searchParams?.page, 1);
  const query = typeof searchParams?.query === 'string' ? searchParams.query.trim() : '';
  const date = parseDateFilter(searchParams?.date);
  const from = parseDateFilter(searchParams?.from);
  const to = parseDateFilter(searchParams?.to);

  const where = buildWhere({ query, date, from, to });

  const [totalCount, appointmentRows] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        patient: {
          select: appointmentPatientSelect,
        },
      },
    }),
  ]);

  const appointments = appointmentRows.map(serializeAppointmentRecord);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    data: appointments,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      query,
      date: date ? formatAppointmentDate(date) : null,
      from: from ? formatAppointmentDate(from) : null,
      to: to ? formatAppointmentDate(to) : null,
    },
  };
}

export default async function AppointmentsPage({ searchParams }) {
  const initialState = await loadAppointments(searchParams);
  return <AppointmentsView initialData={initialState.data} initialMeta={initialState.meta} />;
}
