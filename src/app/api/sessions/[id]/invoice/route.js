import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import prisma from '@/lib/prisma';

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
  return Number(value) || 0;
}

const formatCurrency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
});

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function buildInvoiceBuffer(session) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const clinicName = 'Medical Center Management System';
    doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text(clinicName);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#475569').font('Helvetica').text('Billing Session Invoice', { align: 'left' });

    doc.moveDown(1.5);

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Invoice Details');
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#1e293b');
    doc.text(`Session ID: ${session.id}`);
    doc.text(`Session Date: ${session.date ? new Date(session.date).toLocaleDateString() : '-'}`);
    doc.text(`Created: ${session.createdAt ? new Date(session.createdAt).toLocaleString() : '-'}`);

    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Patient');
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#1e293b');
    doc.text(`Name: ${session.patient?.name ?? 'N/A'}`);
    if (session.patient?.phone) {
      doc.text(`Phone: ${session.patient.phone}`);
    }
    if (session.patient?.email) {
      doc.text(`Email: ${session.patient.email}`);
    }

    doc.moveDown(1);
    const renderLineItemsTable = (title, rows, labelAccessor) => {
      if (!rows.length) {
        return;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(title);
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const columnX = {
        label: 50,
        qty: 260,
        unit: 320,
        discount: 400,
        total: 480,
      };

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Item', columnX.label, tableTop);
      doc.text('Qty', columnX.qty, tableTop);
      doc.text('Unit Price', columnX.unit, tableTop, { width: 60, align: 'right' });
      doc.text('Discount', columnX.discount, tableTop, { width: 60, align: 'right' });
      doc.text('Total', columnX.total, tableTop, { width: 60, align: 'right' });

      doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#cbd5f5').lineWidth(1).stroke();

      doc.font('Helvetica').fillColor('#1e293b');

      rows.forEach((row, index) => {
        const rowY = doc.y + 6;
        doc.text(labelAccessor(row), columnX.label, rowY, { width: 200 });
        doc.text(`${row.quantity}`, columnX.qty, rowY);
        doc.text(formatCurrency.format(safeNumber(row.unitPrice)), columnX.unit, rowY, {
          width: 60,
          align: 'right',
        });
        doc.text(formatCurrency.format(safeNumber(row.discount)), columnX.discount, rowY, {
          width: 60,
          align: 'right',
        });
        doc.text(formatCurrency.format(safeNumber(row.total)), columnX.total, rowY, { width: 60, align: 'right' });

        doc.moveDown(0.8);
        if (index < rows.length - 1) {
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        }
      });

      doc.moveDown(1.2);
    };

    renderLineItemsTable('Treatments', session.items, (row) => row.treatment?.name ?? 'Treatment');
    renderLineItemsTable('Medicines', session.medicineItems ?? [], (row) => row.medicine?.name ?? 'Medicine');

    const treatmentSubtotal = session.items.reduce(
      (sum, item) => sum + safeNumber(item.total) + safeNumber(item.discount),
      0,
    );
    const medicineSubtotal = (session.medicineItems ?? []).reduce(
      (sum, item) => sum + safeNumber(item.total) + safeNumber(item.discount),
      0,
    );
    const subtotal = treatmentSubtotal + medicineSubtotal;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Summary', 50, doc.y);
    doc.font('Helvetica').fillColor('#1e293b');
    doc.moveDown(0.4);
    if (treatmentSubtotal > 0) {
      doc.text(`Treatment Subtotal: ${formatCurrency.format(treatmentSubtotal)}`);
    }
    if (medicineSubtotal > 0) {
      doc.text(`Medicine Subtotal: ${formatCurrency.format(medicineSubtotal)}`);
    }
    doc.text(`Subtotal: ${formatCurrency.format(safeNumber(subtotal))}`);
    doc.text(`Session Discount: ${formatCurrency.format(safeNumber(session.discount))}`);
    doc.text(`Total Due: ${formatCurrency.format(safeNumber(session.total))}`);

    if (session.description) {
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Notes');
      doc.font('Helvetica').fillColor('#1e293b').text(session.description, { width: 500 });
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#94a3b8').text('Generated by Medical Center Management System.', { align: 'center' });

    doc.end();
  });
}

export async function GET(request, { params }) {
  const id = parseId(params?.id);

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
      items: session.items.map((item) => ({
        id: item.id,
        treatment: item.treatment
          ? {
              id: item.treatment.id,
              name: item.treatment.name,
              code: item.treatment.code,
            }
          : null,
        quantity: item.quantity,
        unitPrice: decimalToNumber(item.unitPrice),
        discount: decimalToNumber(item.discount),
        total: decimalToNumber(item.total),
      })),
      medicineItems: session.medicineItems.map((item) => ({
        id: item.id,
        medicine: item.medicine
          ? {
              id: item.medicine.id,
              name: item.medicine.name,
              code: item.medicine.code,
            }
          : null,
        quantity: item.quantity,
        unitPrice: decimalToNumber(item.unitPrice),
        discount: decimalToNumber(item.discount),
        total: decimalToNumber(item.total),
      })),
    };

    const pdfBuffer = await buildInvoiceBuffer(serialised);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="session-${session.id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(`Failed to generate invoice for session ${id}`, error);
    return NextResponse.json({ message: 'Unable to generate invoice.' }, { status: 500 });
  }
}
