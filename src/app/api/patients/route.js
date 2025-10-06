import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validatePatientPayload } from '@/lib/validation/patient';

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

  const filters = [
    { name: { contains: query } },
    { phone: { contains: query } },
    { email: { contains: query } },
  ];

  return { OR: filters };
}

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parsePagination(searchParams);
    const query = searchParams.get('query')?.trim() ?? '';

    const where = buildSearchFilter(query);

    const [totalCount, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return NextResponse.json({
      data: patients,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
        query,
      },
    });
  } catch (error) {
    console.error('Failed to fetch patients', error);
    return NextResponse.json({ message: 'Unable to fetch patients.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validation = validatePatientPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed.', errors: validation.errors }, { status: 400 });
    }

    const created = await prisma.patient.create({
      data: { ...validation.values },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create patient', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
      return NextResponse.json({ message: `A patient with that ${target} already exists.` }, { status: 409 });
    }

    return NextResponse.json({ message: 'Unable to create patient.' }, { status: 500 });
  }
}

