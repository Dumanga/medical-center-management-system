import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function parseDateOnly(value) {
  if (!value) return null;
  const parts = `${value}`.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');
    const fromDate = parseDateOnly(fromRaw) || new Date(1970, 0, 1);
    const toDateBase = parseDateOnly(toRaw) || new Date();
    const toDate = new Date(toDateBase.getFullYear(), toDateBase.getMonth(), toDateBase.getDate() + 1);

    const sessions = await prisma.session.findMany({
      where: {
        date: {
          gte: fromDate,
          lt: toDate,
        },
      },
      include: { patient: true },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    const data = sessions.map((s) => ({
      id: s.id,
      date: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : s.date,
      patientName: s.patient?.name ?? 'Unknown',
      description: s.description ?? '',
      total: typeof s.total?.toNumber === 'function' ? s.total.toNumber() : Number(s.total ?? 0),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to build sessions report', error);
    return NextResponse.json({ message: 'Unable to build session report.' }, { status: 500 });
  }
}

