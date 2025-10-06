import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateStockPayload } from '@/lib/validation/stock';

const DEFAULT_PAGE_SIZE = 10;

function parsePositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parsePagination(searchParams) {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSizeRaw = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(Math.max(pageSizeRaw ?? DEFAULT_PAGE_SIZE, 1), 50);

  return { page, pageSize };
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

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parsePagination(searchParams);
    const query = searchParams.get('query')?.trim() ?? '';
    const typeId = parsePositiveInt(searchParams.get('typeId'));

    const where = buildWhere(query, typeId);

    const [totalCount, stocks, inventoryValueRows, expectedRevenueRows] = await Promise.all([
      prisma.medicineStock.count({ where }),
      prisma.medicineStock.findMany({
        where,
        include: {
          type: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.$queryRaw`SELECT COALESCE(SUM(quantity * incomingPrice), 0) AS totalValue FROM MedicineStock`,
      prisma.$queryRaw`SELECT COALESCE(SUM(quantity * sellingPrice), 0) AS totalRevenue FROM MedicineStock`,
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const inventoryValueRow = Array.isArray(inventoryValueRows) ? inventoryValueRows[0] : inventoryValueRows;
    const inventoryValue = decimalToNumber(inventoryValueRow?.totalValue ?? 0) ?? 0;
    const expectedRevenueRow = Array.isArray(expectedRevenueRows) ? expectedRevenueRows[0] : expectedRevenueRows;
    const expectedRevenue = decimalToNumber(expectedRevenueRow?.totalRevenue ?? 0) ?? 0;

    const data = stocks.map((stock) => ({
      id: stock.id,
      code: stock.code,
      name: stock.name,
      quantity: stock.quantity,
      incomingPrice: decimalToNumber(stock.incomingPrice),
      sellingPrice: decimalToNumber(stock.sellingPrice),
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

    return NextResponse.json({
      data,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
        query,
        typeId,
        inventoryValue,
        expectedRevenue,
      },
    });
  } catch (error) {
    console.error('Failed to fetch stocks', error);
    return NextResponse.json({ message: 'Unable to fetch stocks.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validation = validateStockPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const created = await prisma.medicineStock.create({
      data: {
        medicineTypeId: validation.values.medicineTypeId,
        code: validation.values.code,
        name: validation.values.name,
        quantity: validation.values.quantity,
        incomingPrice: new Prisma.Decimal(validation.values.incomingPrice),
        sellingPrice: new Prisma.Decimal(validation.values.sellingPrice),
      },
      include: {
        type: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create stock item', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'A stock item with that code already exists.' }, { status: 409 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Please select a valid medicine type.' }, { status: 400 });
      }
    }

    return NextResponse.json({ message: 'Unable to create stock item.' }, { status: 500 });
  }
}

