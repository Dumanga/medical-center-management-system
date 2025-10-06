import prisma from '@/lib/prisma';
import PatientsView from '@/components/patients-view';

export const metadata = {
  title: 'Patients | Medical Center Management System',
};

const PAGE_SIZE = 10;

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildWhere(query) {
  if (!query) {
    return undefined;
  }

  return {
    OR: [
      { name: { contains: query } },
      { phone: { contains: query } },
      { email: { contains: query } },
    ],
  };
}

async function loadPatients(searchParams) {
  const page = parseNumber(searchParams?.page, 1);
  const query = typeof searchParams?.query === 'string' ? searchParams.query.trim() : '';
  const where = buildWhere(query);

  const [totalCount, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    data: patients,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      query,
    },
  };
}

export default async function PatientsPage({ searchParams }) {
  const initialState = await loadPatients(searchParams);

  return <PatientsView initialData={initialState.data} initialMeta={initialState.meta} />;
}

