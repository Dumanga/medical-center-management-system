import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateTreatmentPayload } from '@/lib/validation/treatment';

const DEFAULT_PAGE_SIZE = 10;

function parsePagination(searchParams) {
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const sizeParam = Number.parseInt(searchParams.get('pageSize') ?? `${DEFAULT_PAGE_SIZE}`, 10);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(sizeParam) && sizeParam > 0 && sizeParam <= 50 ? sizeParam : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

function buildSearchFilter(query) {
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

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parsePagination(searchParams);
    const query = searchParams.get('query')?.trim() ?? '';

    const where = buildSearchFilter(query);

    const [totalCount, treatments] = await Promise.all([
      prisma.treatment.count({ where }),
      prisma.treatment.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return NextResponse.json({
      data: treatments,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
        query,
      },
    });
  } catch (error) {
    console.error('Failed to fetch treatments', error);
    return NextResponse.json({ message: 'Unable to fetch treatments.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validation = validateTreatmentPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const created = await prisma.treatment.create({
      data: {
        code: validation.values.code,
        name: validation.values.name,
        price: new Prisma.Decimal(validation.values.price),
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create treatment', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
      return NextResponse.json({ message: `A treatment with that ${target} already exists.` }, { status: 409 });
    }

    return NextResponse.json({ message: 'Unable to create treatment.' }, { status: 500 });
  }
}

