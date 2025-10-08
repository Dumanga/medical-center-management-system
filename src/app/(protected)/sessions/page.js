import prisma from '@/lib/prisma';
import SessionsView from '@/components/sessions-view';

export const metadata = {
  title: 'Billing Sessions | Medical Center Management System',
};

const PAGE_SIZE = 10;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}


function decimalToNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function serializeSession(session) {
  return {
    id: session.id,
    appointmentCharge: decimalToNumber(session.appointmentCharge),
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
    discount: decimalToNumber(session.discount),
    total: decimalToNumber(session.total),
    items: session.items?.map((item) => ({
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
    })) ?? [],
    createdAt: session.createdAt?.toISOString?.() ?? null,
    updatedAt: session.updatedAt?.toISOString?.() ?? null,
  };
}

function resolveSearchParamValue(params, key) {
  if (!params) {
    return undefined;
  }
  if (typeof params.get === 'function') {
    return params.get(key);
  }
  return params[key];
}

async function loadInitialData(searchParamsPromise) {
  const params = await searchParamsPromise;
  const pageRaw = resolveSearchParamValue(params, 'page');
  const queryRaw = resolveSearchParamValue(params, 'query');
  const page = parsePositiveInt(pageRaw, 1);
  const query = typeof queryRaw === 'string' ? queryRaw.trim() : '';

  const where = query
    ? {
        OR: [
          { description: { contains: query } },
          { patient: { name: { contains: query } } },
          Number.isFinite(Number.parseInt(query, 10)) ? { id: Number.parseInt(query, 10) } : undefined,
        ].filter(Boolean),
      }
    : undefined;

  const [
    totalCount,
    sessionsRaw,
    patientsRaw,
    treatmentsRaw,
    appointmentsRaw,
    medicinesRaw,
    medicineTypesRaw,
  ] = await Promise.all([
    prisma.session.count({ where }),
    prisma.session.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    prisma.patient.findMany({
      orderBy: [{ name: 'asc' }],
      take: 100,
    }),
    prisma.treatment.findMany({
      orderBy: [{ name: 'asc' }],
    }),
    prisma.appointment.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 100,
      include: {
        patient: true,
      },
    }),
    prisma.medicineStock.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        type: true,
      },
    }),
    prisma.medicineType.findMany({
      orderBy: [{ name: 'asc' }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const sessions = sessionsRaw.map(serializeSession);

  const patients = patientsRaw.map((patient) => ({
    id: patient.id,
    name: patient.name,
    phone: patient.phone,
    email: patient.email,
  }));

  const treatments = treatmentsRaw.map((treatment) => ({
    id: treatment.id,
    name: treatment.name,
    code: treatment.code,
    price: decimalToNumber(treatment.price),
  }));

  const medicines = medicinesRaw.map((medicine) => ({
    id: medicine.id,
    name: medicine.name,
    code: medicine.code,
    sellingPrice: decimalToNumber(medicine.sellingPrice),
    type: medicine.type
      ? {
          id: medicine.type.id,
          name: medicine.type.name,
        }
      : null,
  }));

  const medicineTypes = medicineTypesRaw.map((type) => ({
    id: type.id,
    name: type.name,
  }));

  const appointments = appointmentsRaw.map((appointment) => ({
    id: appointment.id,
    patientId: appointment.patientId,
    patient: appointment.patient
      ? {
          id: appointment.patient.id,
          name: appointment.patient.name,
        }
      : null,
    date: appointment.date?.toISOString?.() ?? null,
    time: appointment.time?.toISOString?.() ?? null,
  }));

  return {
    sessions,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      query,
    },
    patients,
    treatments,
    medicines,
    medicineTypes,
    appointments,
  };
}

export default async function SessionsPage({ searchParams }) {
  const initialState = await loadInitialData(searchParams);

  return (
    <SessionsView
      initialData={initialState.sessions}
      initialMeta={initialState.meta}
      patients={initialState.patients}
      treatments={initialState.treatments}
      medicines={initialState.medicines}
      medicineTypes={initialState.medicineTypes}
      appointments={initialState.appointments}
    />
  );
}
