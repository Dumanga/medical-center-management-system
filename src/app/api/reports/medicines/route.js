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

    // Fetch medicine line items for paid sessions in date range
    const items = await prisma.sessionMedicine.findMany({
      where: {
        session: {
          isPaid: true,
          date: {
            gte: fromDate,
            lt: toDate,
          },
        },
      },
      include: {
        medicine: {
          include: { type: true },
        },
      },
    });

    const byId = new Map();
    for (const it of items) {
      const id = it.medicineId;
      const q = it.quantity || 0;
      const total = typeof it.total?.toNumber === 'function' ? it.total.toNumber() : Number(it.total ?? 0);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          code: it.medicine?.code ?? '',
          name: it.medicine?.name ?? 'Unknown',
          typeName: it.medicine?.type?.name ?? '',
          quantity: 0,
          revenue: 0,
        });
      }
      const agg = byId.get(id);
      agg.quantity += q;
      agg.revenue += total;
    }

    const data = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to build medicines report', error);
    return NextResponse.json({ message: 'Unable to build medicine report.' }, { status: 500 });
  }
}

