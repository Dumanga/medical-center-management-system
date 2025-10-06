import prisma from '@/lib/prisma';
import TreatmentsView from '@/components/treatments-view';

export const metadata = {
  title: 'Treatments | Medical Center Management System',
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
      { code: { contains: query } },
      { name: { contains: query } },
    ],
  };
}

async function loadTreatments(searchParams) {
  const page = parseNumber(searchParams?.page, 1);
  const query = typeof searchParams?.query === 'string' ? searchParams.query.trim() : '';
  const where = buildWhere(query);

  const [totalCount, treatmentsRaw] = await Promise.all([
    prisma.treatment.count({ where }),
    prisma.treatment.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const treatments = treatmentsRaw.map((treatment) => ({
    ...treatment,
    price: treatment.price ? Number(treatment.price) : null,
    createdAt: treatment.createdAt?.toISOString ? treatment.createdAt.toISOString() : treatment.createdAt,
    updatedAt: treatment.updatedAt?.toISOString ? treatment.updatedAt.toISOString() : treatment.updatedAt,
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    data: treatments,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      query,
    },
  };
}

export default async function TreatmentsPage({ searchParams }) {
  const initialState = await loadTreatments(searchParams);

  return <TreatmentsView initialData={initialState.data} initialMeta={initialState.meta} />;
}

