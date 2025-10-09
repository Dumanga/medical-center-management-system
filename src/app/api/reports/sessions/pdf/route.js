import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import prisma from '@/lib/prisma';

function parseDateOnly(value) {
  if (!value) return null;
  const parts = `${value}`.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

const formatCurrency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
});

async function getData(searchParams) {
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');
  const fromDate = parseDateOnly(fromRaw) || new Date(1970, 0, 1);
  const toDateBase = parseDateOnly(toRaw) || new Date();
  const toDate = new Date(toDateBase.getFullYear(), toDateBase.getMonth(), toDateBase.getDate() + 1);
  const rows = await prisma.session.findMany({
    where: { date: { gte: fromDate, lt: toDate } },
    include: { patient: true },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  });
  return rows.map((s) => ({
    id: s.id,
    date: s.date instanceof Date ? s.date.toISOString().slice(0, 10) : s.date,
    patientName: s.patient?.name ?? 'Unknown',
    description: s.description ?? '',
    total: typeof s.total?.toNumber === 'function' ? s.total.toNumber() : Number(s.total ?? 0),
  }));
}

function renderHtml(rows, title) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: 'Inter','Segoe UI',sans-serif; margin: 16px; color: #0f172a; }
        h1 { font-size: 18px; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 8px 6px; }
        td { font-size: 12px; border-bottom: 1px solid #f1f5f9; padding: 8px 6px; }
        tr:nth-child(odd) td { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>
            <th>Session #</th>
            <th>Date</th>
            <th>Patient</th>
            <th>Description</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>#${String(r.id).padStart(4, '0')}</td>
              <td>${r.date}</td>
              <td>${r.patientName}</td>
              <td>${r.description || ''}</td>
              <td>${formatCurrency.format(r.total)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </body>
  </html>`;
}

export async function GET(request) {
  try {
    const rows = await getData(request.nextUrl.searchParams);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(renderHtml(rows, 'Session Report'), { waitUntil: 'networkidle' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
      return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="session-report.pdf"' } });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Failed to export sessions report PDF', error);
    return NextResponse.json({ message: 'Unable to export PDF.' }, { status: 500 });
  }
}

