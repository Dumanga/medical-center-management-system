import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const LOGO_PATH = path.join(process.cwd(), 'public', 'invoice-logo.png');

function getLogoDataUrl() {
  try {
    const file = fs.readFileSync(LOGO_PATH);
    return `data:image/png;base64,${file.toString('base64')}`;
  } catch (error) {
    console.warn('Invoice logo not found at public/invoice-logo.png. Using fallback.', error?.message ?? error);
    return (
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><circle cx="80" cy="80" r="76" fill="url(#grad)" opacity="0.85"/></svg>`
      )
    );
  }
}

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

  const logoSrc = getLogoDataUrl();

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
        padding: 8mm 10mm;
        background: #ffffff;
        font-size: 11.5px;
      }
      .invoice {
        width: 100%;
        min-height: calc(100% - 20mm);
        display: flex;
        flex-direction: column;
        gap: 18px;
        position: relative;
      }
      .watermark {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: none;
        opacity: 0.18;
        z-index: 0;
      }
      .watermark img {
        width: 82%;
        max-width: 380px;
        filter: saturate(0.9);
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .brand img {
        width: 120px;
        height: 120px;
        border-radius: 28px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.15);
      }
      .brand-text h1 {
        font-size: 24px;
        margin: 0;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #0f172a;
      }
      .brand-text p {
        margin: 8px 0 0;
        font-size: 11.5px;
        color: #4b5563;
      }
      .invoice-meta {
        text-align: right;
        font-size: 11px;
        color: #475569;
      }
      .section {
        display: grid;
        gap: 16px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 14px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 16px;
        background: #f8fafc;
        min-height: 110px;
      }
      .card h3 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0 0 8px;
        color: #64748b;
      }
      .card p {
        margin: 6px 0;
        font-size: 12.5px;
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
      tbody tr:nth-child(odd) td {
        background: #f8fafc;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .summary {
        margin-top: 12px;
        padding: 14px 18px;
        background: #f8fafc;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        font-size: 12px;
        width: 60%;
        margin-left: auto;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .summary-row:last-child {
        margin-bottom: 0;
        font-weight: 600;
        font-size: 13px;
      }
      .notes {
        margin-top: 12px;
        padding: 14px 16px;
        border-left: 3px solid #0ea5e9;
        background: #f0f9ff;
        border-radius: 8px;
        font-size: 12px;
      }
      footer {
        margin-top: auto;
        font-size: 10px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
  </head>
  <body>
      <div class="invoice">
      <div class="watermark"><img src="${logoSrc}" alt="Sri Ayurveda watermark" /></div>
      <header>
        <div class="brand">
          <img src="${logoSrc}" alt="Clinic Logo" />
          <div class="brand-text">
            <h1>SRI AYURVEDA</h1>
            <p>Billing Session Invoice</p>
          </div>
        </div>
        <div class="invoice-meta">
          <div>Invoice #: ${session.id.toString().padStart(4, '0')}</div>
          <div>Generated: ${createdDate}</div>
        </div>
      </header>

      <section class="section">
        <div class="info-grid">
          <div class="card">
            <h3>Invoice Details</h3>
            <p>Session ID: #${session.id}</p>
            <p>Session Date: ${formattedDate}</p>
            <p>Created: ${createdDate}</p>
          </div>
          <div class="card">
            <h3>Patient</h3>
            <p>${session.patient?.name ?? 'N/A'}</p>
            <p style="font-size:11px;color:#475569;margin-top:4px;">
              ${session.patient?.phone ?? 'No phone on record'}<br />
              ${session.patient?.email ?? 'No email available'}
            </p>
          </div>
          <div class="card">
            <h3>Payment Summary</h3>
            <p>Total Due: ${formatCurrency.format(decimalToNumber(session.total))}</p>
            <p style="font-size:11px;color:#475569;margin-top:4px;">Discount Applied: ${formatCurrency.format(
              decimalToNumber(session.discount),
            )}</p>
          </div>
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

      <footer>
        <span>Thank you for trusting our medical center.</span>
        <span>Generated on ${createdDate}</span>
      </footer>
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
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '8mm',
        right: '8mm',
      },
      printBackground: true,
      preferCSSPageSize: true,
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
