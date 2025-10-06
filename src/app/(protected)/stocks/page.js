import prisma from '@/lib/prisma';
import StocksView from '@/components/stocks-view';

export const metadata = {
  title: 'Stocks | Medical Center Management System',
};

const PAGE_SIZE = 10;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildWhere(query, typeId) {
  const where = {};

  if (typeId) {
    where.medicineTypeId = typeId;
  }

  if (query) {
    where.OR = [
      { code: { contains: query } },
      { name: { contains: query } },
    ];
  }

  return where;
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

async function loadInitialData(searchParams) {
  const page = parsePositiveInt(searchParams?.page, 1);
  const query = typeof searchParams?.query === 'string' ? searchParams.query.trim() : '';
  const typeId = parsePositiveInt(searchParams?.typeId, null);

  const where = buildWhere(query, typeId);

  const [totalCount, stocksRaw, typesRaw] = await Promise.all([
    prisma.medicineStock.count({ where }),
    prisma.medicineStock.findMany({
      where,
      include: { type: true },
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.medicineType.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        _count: { select: { stocks: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const stocks = stocksRaw.map((stock) => ({
    id: stock.id,
    code: stock.code,
    name: stock.name,
    quantity: stock.quantity,
    incomingPrice: decimalToNumber(stock.incomingPrice) ?? 0,
    sellingPrice: decimalToNumber(stock.sellingPrice) ?? 0,
    medicineTypeId: stock.medicineTypeId,
    type: stock.type
      ? {
          id: stock.type.id,
          name: stock.type.name,
        }
      : null,
    createdAt: stock.createdAt?.toISOString ? stock.createdAt.toISOString() : null,
    updatedAt: stock.updatedAt?.toISOString ? stock.updatedAt.toISOString() : null,
  }));

  const types = typesRaw.map((type) => ({
    id: type.id,
    name: type.name,
    stockCount: type._count?.stocks ?? 0,
    createdAt: type.createdAt?.toISOString ? type.createdAt.toISOString() : null,
    updatedAt: type.updatedAt?.toISOString ? type.updatedAt.toISOString() : null,
  }));

  return {
    stocks,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      query,
      typeId,
    },
    types,
  };
}

export default async function StocksPage({ searchParams }) {
  const initialState = await loadInitialData(searchParams);

  return (
    <StocksView
      initialData={initialState.stocks}
      initialMeta={initialState.meta}
      initialTypes={initialState.types}
    />
  );
}
