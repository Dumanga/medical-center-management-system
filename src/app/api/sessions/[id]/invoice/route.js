import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

function parseId(value) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

const formatCurrency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
});

function renderLineItems(session) {
  const treatments = (session.items ?? []).map((item) => ({
    id: `treatment-${item.id}`,
    type: 'Treatment',
    name: item.treatment?.name ?? 'Treatment',
    code: item.treatment?.code ?? '',
    quantity: item.quantity,
    unitPrice: decimalToNumber(item.unitPrice),
    discount: decimalToNumber(item.discount),
    total: decimalToNumber(item.total),
  }));

  const medicines = (session.medicineItems ?? []).map((item) => ({
    id: `medicine-${item.id}`,
    type: 'Medicine',
    name: item.medicine?.name ?? 'Medicine',
    code: item.medicine?.code ?? '',
    quantity: item.quantity,
    unitPrice: decimalToNumber(item.unitPrice),
    discount: decimalToNumber(item.discount),
    total: decimalToNumber(item.total),
  }));

  return [...treatments, ...medicines];
}

function buildInvoiceHtml(session) {
  const items = renderLineItems(session);
  const treatmentSubtotal = items
    .filter((item) => item.type === 'Treatment')
    .reduce((sum, item) => sum + item.total + item.discount, 0);
  const medicineSubtotal = items
    .filter((item) => item.type === 'Medicine')
    .reduce((sum, item) => sum + item.total + item.discount, 0);
  const subtotal = treatmentSubtotal + medicineSubtotal;

  const formattedDate = session.date ? new Date(session.date).toLocaleDateString() : 'N/A';
  const createdDate = session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A';

  const head = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * {
        box-sizing: border-box;
        font-family: 'Inter', 'Segoe UI', sans-serif;
        color: #0f172a;
      }
      body {
        margin: 0;
        padding: 18mm 16mm;
        background: #f8fafc;
        font-size: 12px;
      }
      .invoice {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 20px 22px;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 4px;
        color: #0f172a;
      }
      .subtitle {
        font-size: 11px;
        color: #475569;
      }
      .flex {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }
      .section {
        margin-top: 18px;
      }
      .card {
        background: #f8fafc;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        padding: 14px 16px;
        flex: 1 1 160px;
      }
      .card h3 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0;
        color: #64748b;
      }
      .card p {
        margin: 6px 0 0;
        font-size: 13px;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      th {
        text-align: left;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
        padding: 8px 6px;
        border-bottom: 1px solid #e2e8f0;
      }
      td {
        padding: 10px 6px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 12px;
        color: #1e293b;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .summary {
        margin-top: 12px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        font-size: 12px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .summary-row:last-child {
        margin-bottom: 0;
        font-weight: 600;
        font-size: 13px;
      }
      .notes {
        margin-top: 16px;
        padding: 12px 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="invoice">
      <header>
        <h1>Medical Center Management System</h1>
        <div class="subtitle">Billing Session Invoice</div>
      </header>

      <section class="section flex">
        <div class="card">
          <h3>Invoice Details</h3>
          <p>Session ID: <strong>#${session.id}</strong></p>
          <p>Session Date: ${formattedDate}</p>
          <p>Generated: ${createdDate}</p>
        </div>
        <div class="card">
          <h3>Patient</h3>
          <p>${session.patient?.name ?? 'N/A'}</p>
          <p style="font-size:11px;color:#475569;margin-top:4px;">
            ${session.patient?.phone ?? 'No phone on record'}<br />
            ${session.patient?.email ?? 'No email available'}
          </p>
        </div>
      </section>

      <section class="section">
        <h3 style="font-size:12px;margin:0 0 6px;color:#0f172a;">Invoice Items</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Code</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Discount</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.length === 0
                ? '<tr><td colspan="7" style="text-align:center;padding:16px 6px;color:#64748b;">No invoice items recorded.</td></tr>'
                : items
                    .map(
                      (item) => `
                        <tr>
                          <td>${item.name}</td>
                          <td style="color:#475569;">${item.type}</td>
                          <td style="color:#475569;">${item.code || '—'}</td>
                          <td style="text-align:right;">${item.quantity}</td>
                          <td style="text-align:right;">${formatCurrency.format(item.unitPrice)}</td>
                          <td style="text-align:right;">${formatCurrency.format(item.discount)}</td>
                          <td style="text-align:right;">${formatCurrency.format(item.total)}</td>
                        </tr>
                      `,
                    )
                    .join('')
            }
          </tbody>
        </table>

        <div class="summary">
          ${
            treatmentSubtotal > 0
              ? `<div class="summary-row"><span>Treatment Subtotal</span><span>${formatCurrency.format(
                  treatmentSubtotal,
                )}</span></div>`
              : ''
          }
          ${
            medicineSubtotal > 0
              ? `<div class="summary-row"><span>Medicine Subtotal</span><span>${formatCurrency.format(
                  medicineSubtotal,
                )}</span></div>`
              : ''
          }
          <div class="summary-row"><span>Subtotal</span><span>${formatCurrency.format(subtotal)}</span></div>
          <div class="summary-row"><span>Session Discount</span><span>${formatCurrency.format(
            decimalToNumber(session.discount),
          )}</span></div>
          <div class="summary-row"><span>Total Due</span><span>${formatCurrency.format(
            decimalToNumber(session.total),
          )}</span></div>
        </div>
      </section>

      ${
        session.description
          ? `<section class="notes"><strong>Notes:</strong><br/>${session.description
              .split('\n')
              .map((line) => `<span>${line}</span>`)
              .join('<br/>')}</section>`
          : ''
      }
    </div>
  </body>
</html>`;

  return head;
}

async function generateInvoicePdf(session) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(buildInvoiceHtml(session), {
      waitUntil: 'networkidle',
    });
    return await page.pdf({
      format: 'A5',
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const id = parseId(resolvedParams?.id);

  if (!id) {
    return NextResponse.json({ message: 'Invalid session id.' }, { status: 400 });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id },
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
    });

    if (!session) {
      return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
    }

    const serialised = {
      id: session.id,
      patient: session.patient
        ? {
            id: session.patient.id,
            name: session.patient.name,
            phone: session.patient.phone,
            email: session.patient.email,
          }
        : null,
      date: session.date?.toISOString?.() ?? null,
      createdAt: session.createdAt?.toISOString?.() ?? null,
      description: session.description ?? '',
      discount: decimalToNumber(session.discount) ?? 0,
      total: decimalToNumber(session.total) ?? 0,
      items: session.items,
      medicineItems: session.medicineItems,
    };

    const pdfBuffer = await generateInvoicePdf(serialised);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="session-${session.id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(`Failed to generate invoice for session ${id}`, error);
    return NextResponse.json(
      {
        message: 'Unable to generate invoice.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

