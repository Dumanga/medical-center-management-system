'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import Select from './ui/select';
import TreatmentPickerModal from './treatment-picker-modal';
import TreatmentModal from './treatment-modal';
import MedicinePickerModal from './medicine-picker-modal';
import StockModal from './stock-modal';

const TODAY_ISO = format(new Date(), 'yyyy-MM-dd');

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'LKR 0.00';
  }
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `LKR ${Number(value).toFixed(2)}`;
  }
}

const INITIAL_FORM = {
  patientId: '',
  appointmentId: '',
  date: TODAY_ISO,
  description: '',
  discount: '0.00',
  items: [],
  medicineItems: [],
};

// Removed previously added default "Appointment Charges" line item.

let tempId = 0;

function createItemFromTreatment(treatment) {
  tempId += 1;
  const price = Number(treatment.price ?? 0);
  return {
    tempId,
    treatmentId: treatment.id,
    treatmentName: treatment.name,
    treatmentCode: treatment.code ?? '',
    quantity: '1',
    unitPrice: price.toFixed(2),
    discount: '0.00',
    total: price,
  };
}

function createItemFromMedicine(medicine) {
  tempId += 1;
  const price = Number(medicine.sellingPrice ?? 0);
  return {
    tempId,
    medicineId: medicine.id,
    medicineName: medicine.name,
    medicineCode: medicine.code,
    quantity: '1',
    unitPrice: price.toFixed(2),
    discount: '0.00',
    total: price,
  };
}

function SessionSummary({ session }) {
  const treatmentSubtotal =
    session.items?.reduce((sum, item) => sum + (item.total ?? 0) + (item.discount ?? 0), 0) ?? 0;
  const medicineSubtotal =
    session.medicineItems?.reduce((sum, item) => sum + (item.total ?? 0) + (item.discount ?? 0), 0) ?? 0;
  const subtotal = treatmentSubtotal + medicineSubtotal;
  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
      {treatmentSubtotal > 0 ? (
        <div className="flex items-center justify-between">
          <span>Treatments</span>
          <span className="font-semibold text-slate-900">{formatCurrency(treatmentSubtotal)}</span>
        </div>
      ) : null}
      {medicineSubtotal > 0 ? (
        <div className="flex items-center justify-between">
          <span>Medicines</span>
          <span className="font-semibold text-slate-900">{formatCurrency(medicineSubtotal)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span>Subtotal</span>
        <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Session Discount</span>
        <span className="font-semibold text-slate-900">{formatCurrency(session.discount ?? 0)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
        <span>Total</span>
        <span>{formatCurrency(session.total ?? 0)}</span>
      </div>
    </div>
  );
}

function SessionView({ session, onBack, onUpdated }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccessOpen, setSuccessOpen] = useState(false);

  const handleMarkPaid = useCallback(async () => {
    if (!session?.id || session.isPaid) return;
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to update session.');
      }
      // Trust API response if present, otherwise flip locally
      const next = payload?.data && typeof payload.data === 'object' ? payload.data : { ...session, isPaid: true };
      if (!next.isPaid) {
        next.isPaid = true;
      }
      onUpdated?.(next);
      setSuccessOpen(true);
      setTimeout(() => {
        setSuccessOpen(false);
        onBack?.();
      }, 1200);
    } catch (error) {
      console.error('Mark paid failed', error);
      alert('Failed to update status to Paid.');
    } finally {
      setIsUpdating(false);
    }
  }, [session?.id, session?.isPaid, onUpdated]);
  const lineItems = useMemo(() => {
    const treatmentLines = (session.items ?? []).map((item) => ({
      id: item.id,
      kind: 'Treatment',
      name: item.treatment?.name ?? 'Treatment',
      code: item.treatment?.code ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      total: item.total ?? 0,
    }));

    const medicineLines = (session.medicineItems ?? []).map((item) => ({
      id: item.id,
      kind: 'Medicine',
      name: item.medicine?.name ?? 'Medicine',
      code: item.medicine?.code ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      total: item.total ?? 0,
    }));

    return [...treatmentLines, ...medicineLines];
  }, [session.items, session.medicineItems]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Billing Session #{session.id}</h2>
          <p className="text-sm text-slate-600">
            Created {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="mr-2 hidden sm:flex">
            {session.isPaid ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Paid
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                Payment Pending
              </span>
            )}
          </div>
          {!session.isPaid ? (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={isUpdating}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isUpdating ? 'Updating...' : 'Mark as Paid'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.open(`/api/sessions/${session.id}/invoice`, '_blank', 'noopener')}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
          >
            Download Invoice
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
          >
            Back to Sessions
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</h3>
          <p className="mt-2 text-sm font-semibold text-slate-900">{session.patient?.name ?? 'Unknown patient'}</p>
          <p className="text-xs text-slate-500">{session.patient?.phone ?? 'No phone on record'}</p>
          <p className="text-xs text-slate-500">{session.patient?.email ?? 'No email on record'}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session Date</h3>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {session.date ? new Date(session.date).toLocaleDateString() : 'Not specified'}
          </p>
        </div>
        <SessionSummary session={session} />
      </div>

      <div className="rounded-2xl border border-slate-100">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Invoice Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {lineItems.map((item) => (
                <tr key={`${item.kind}-${item.id}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.kind}</td>
                  <td className="px-4 py-3 text-slate-500">{item.code || '—'}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.discount ?? 0)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(item.total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {session.description ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
          <p className="mt-2 text-sm text-slate-700">{session.description}</p>
        </div>
      ) : null}

      {isSuccessOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm transform rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-100">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-2.59a.75.75 0 10-1.22-.86l-3.41 4.83-1.77-1.77a.75.75 0 10-1.06 1.06l2.4 2.4c.32.32.84.27 1.09-.11l4.97-6.55z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-base font-semibold text-slate-900">Marked as Paid</h3>
            <p className="mt-1 text-center text-sm text-slate-600">The session was updated successfully.</p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSuccessOpen(false);
                  onBack?.();
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                Back to Sessions
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SessionEditor({
  mode = 'create',
  session,
  patients,
  treatments,
  medicines,
  medicineTypes,
  appointments,
  onCancel,
  onSuccess,
  onUpdated,
}) {
  const [form, setForm] = useState({ ...INITIAL_FORM, date: TODAY_ISO });
  const [submitErrors, setSubmitErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [availableTreatments, setAvailableTreatments] = useState(treatments ?? []);
  const [isTreatmentPickerOpen, setTreatmentPickerOpen] = useState(false);
  const [isTreatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState(medicines ?? []);
  const [availableMedicineTypes, setAvailableMedicineTypes] = useState(medicineTypes ?? []);
  const [isMedicinePickerOpen, setMedicinePickerOpen] = useState(false);
  const [isMedicineModalOpen, setMedicineModalOpen] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      setForm({ ...INITIAL_FORM, date: TODAY_ISO });
      setSubmitErrors([]);
      setSubmitting(false);
    }
  }, [mode]);

  useEffect(() => {
    setAvailableTreatments(treatments ?? []);
    setAvailableMedicines(medicines ?? []);
    setAvailableMedicineTypes(medicineTypes ?? []);
  }, [treatments, medicines, medicineTypes]);

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        value: String(patient.id),
        label: `${patient.name}${patient.phone ? ` (${patient.phone})` : ''}`,
      })),
    [patients],
  );

  const appointmentOptions = useMemo(
    () =>
      appointments.map((appointment) => {
        const patientName = appointment.patient?.name ?? 'Unknown patient';
        const date = appointment.date ? new Date(appointment.date) : null;
        let timeText = null;
        if (appointment.time) {
          const parsed = new Date(appointment.time);
          if (!Number.isNaN(parsed.getTime())) {
            timeText = parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (typeof appointment.time === 'string') {
            timeText = appointment.time;
          }
        }
        const labelParts = [
          patientName,
          date ? date.toLocaleDateString() : null,
          timeText,
        ].filter(Boolean);
        return {
          value: String(appointment.id),
          label: labelParts.join(' • '),
          patientId: appointment.patientId,
          date: appointment.date,
        };
      }),
    [appointments],
  );

  const treatmentsSubtotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const quantity = Number.parseInt(item.quantity, 10) || 0;
        const unitPrice = Number.parseFloat(item.unitPrice) || 0;
        const discount = Number.parseFloat(item.discount) || 0;
        const gross = quantity * unitPrice;
        return sum + Math.max(0, gross - discount);
      }, 0),
    [form.items],
  );

  const medicinesSubtotal = useMemo(
    () =>
      form.medicineItems.reduce((sum, item) => {
        const quantity = Number.parseInt(item.quantity, 10) || 0;
        const unitPrice = Number.parseFloat(item.unitPrice) || 0;
        const discount = Number.parseFloat(item.discount) || 0;
        const gross = quantity * unitPrice;
        return sum + Math.max(0, gross - discount);
      }, 0),
    [form.medicineItems],
  );

  const sessionSubtotal = treatmentsSubtotal + medicinesSubtotal;

  const sessionDiscount = Number.parseFloat(form.discount) || 0;
  const sessionTotal = Math.max(0, sessionSubtotal - sessionDiscount);

  const handleAppointmentSelect = useCallback(
    (appointmentId) => {
      if (!appointmentId) {
        setForm((previous) => ({
          ...previous,
          appointmentId: '',
          patientId: '',
          date: TODAY_ISO,
        }));
        return;
      }

      const option = appointmentOptions.find((item) => item.value === appointmentId);
      setForm((previous) => ({
        ...previous,
        appointmentId,
        patientId: option?.patientId ? String(option.patientId) : previous.patientId,
        date: option?.date ? option.date.slice(0, 10) : previous.date,
      }));
    },
    [appointmentOptions],
  );

  const handleAddTreatment = useCallback((treatment) => {
    if (!treatment) {
      return;
    }
    setForm((previous) => {
      const existing = previous.items.find((item) => item.treatmentId === treatment.id);
      if (existing) {
        const updatedItems = previous.items.map((item) =>
          item.treatmentId === treatment.id
            ? { ...item, quantity: String(Number.parseInt(item.quantity, 10) + 1) }
            : item,
        );
        return { ...previous, items: updatedItems };
      }
      return {
        ...previous,
        items: [...previous.items, createItemFromTreatment(treatment)],
      };
    });
  }, []);

  const handleTreatmentPickerAdd = useCallback(
    (treatment) => {
      handleAddTreatment(treatment);
    },
    [handleAddTreatment],
  );

  const handleTreatmentPickerClose = useCallback(() => {
    setTreatmentPickerOpen(false);
  }, []);

  const handleCreateTreatmentClick = useCallback(() => {
    setTreatmentModalOpen(true);
  }, []);

  const handleTreatmentModalClose = useCallback(() => {
    setTreatmentModalOpen(false);
  }, []);

  const handleTreatmentModalSuccess = useCallback(
    ({ treatment }) => {
      if (!treatment) {
        return;
      }

      setAvailableTreatments((previous) => {
        const exists = previous.some((item) => item.id === treatment.id);
        const next = exists
          ? previous.map((item) => (item.id === treatment.id ? treatment : item))
          : [...previous, treatment];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });

      handleAddTreatment(treatment);
      setTreatmentModalOpen(false);
      setTreatmentPickerOpen(true);
    },
    [handleAddTreatment],
  );

  const handleAddMedicine = useCallback((medicine) => {
    if (!medicine) {
      return;
    }
    setForm((previous) => {
      const existing = previous.medicineItems.find((item) => item.medicineId === medicine.id);
      if (existing) {
        const updatedItems = previous.medicineItems.map((item) =>
          item.medicineId === medicine.id
            ? { ...item, quantity: String(Number.parseInt(item.quantity, 10) + 1) }
            : item,
        );
        return { ...previous, medicineItems: updatedItems };
      }
      return {
        ...previous,
        medicineItems: [...previous.medicineItems, createItemFromMedicine(medicine)],
      };
    });
  }, []);

  const handleMedicinePickerAdd = useCallback(
    (medicine) => {
      handleAddMedicine(medicine);
    },
    [handleAddMedicine],
  );

  const handleMedicinePickerClose = useCallback(() => {
    setMedicinePickerOpen(false);
  }, []);

  const handleCreateMedicineClick = useCallback(() => {
    setMedicineModalOpen(true);
  }, []);

  const handleMedicineModalClose = useCallback(() => {
    setMedicineModalOpen(false);
  }, []);

  const handleMedicineModalSuccess = useCallback(
    ({ stock }) => {
      if (!stock) {
        return;
      }

      setAvailableMedicines((previous) => {
        const exists = previous.some((item) => item.id === stock.id);
        const next = exists
          ? previous.map((item) => (item.id === stock.id ? stock : item))
          : [...previous, stock];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });

      if (stock.type) {
        setAvailableMedicineTypes((previous) => {
          if (previous.some((type) => type.id === stock.type.id)) {
            return previous;
          }
          const next = [...previous, { id: stock.type.id, name: stock.type.name }];
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });
      }

      handleAddMedicine({
        id: stock.id,
        name: stock.name,
        code: stock.code,
        sellingPrice: stock.sellingPrice,
      });
      setMedicineModalOpen(false);
      setMedicinePickerOpen(true);
    },
    [handleAddMedicine],
  );

  const handleItemChange = useCallback((tempItemId, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item) => (item.tempId === tempItemId ? { ...item, [field]: value } : item)),
    }));
  }, []);

  const handleRemoveItem = useCallback((tempItemId) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((item) => item.tempId !== tempItemId),
    }));
  }, []);

  const handleMedicineItemChange = useCallback((tempItemId, field, value) => {
    setForm((previous) => ({
      ...previous,
      medicineItems: previous.medicineItems.map((item) =>
        item.tempId === tempItemId ? { ...item, [field]: value } : item,
      ),
    }));
  }, []);

  const handleRemoveMedicine = useCallback((tempItemId) => {
    setForm((previous) => ({
      ...previous,
      medicineItems: previous.medicineItems.filter((item) => item.tempId !== tempItemId),
    }));
  }, []);

  const editableLineItems = useMemo(
    () => [
      ...form.items.map((item) => ({
        kind: 'treatment',
        tempId: item.tempId,
        name: item.treatmentName,
        code: item.treatmentCode ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        isLocked: item.isLocked,
      })),
      ...form.medicineItems.map((item) => ({
        kind: 'medicine',
        tempId: item.tempId,
        name: item.medicineName,
        code: item.medicineCode ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
    ],
    [form.items, form.medicineItems],
  );

  const handleLineItemChange = useCallback(
    (lineItem, field, value) => {
      if (lineItem.kind === 'treatment') {
        if (lineItem.isLocked) {
          return;
        }
        handleItemChange(lineItem.tempId, field, value);
      } else {
        handleMedicineItemChange(lineItem.tempId, field, value);
      }
    },
    [handleItemChange, handleMedicineItemChange],
  );

  const handleLineItemRemove = useCallback(
    (lineItem) => {
      if (lineItem.kind === 'treatment') {
        if (lineItem.isLocked) {
          return;
        }
        handleRemoveItem(lineItem.tempId);
      } else {
        handleRemoveMedicine(lineItem.tempId);
      }
    },
    [handleRemoveItem, handleRemoveMedicine],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitting(true);
      setSubmitErrors([]);

      const payload = {
        patientId: form.patientId ? Number.parseInt(form.patientId, 10) : null,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        description: form.description,
        discount: Number.parseFloat(form.discount || '0'),
        items: form.items.map((item) => ({
          treatmentId: item.treatmentId,
          quantity: Number.parseInt(item.quantity, 10) || 0,
          unitPrice: Number.parseFloat(item.unitPrice) || 0,
          discount: Number.parseFloat(item.discount || '0') || 0,
        })),
        medicines: form.medicineItems.map((item) => ({
          medicineId: item.medicineId,
          quantity: Number.parseInt(item.quantity, 10) || 0,
          unitPrice: Number.parseFloat(item.unitPrice) || 0,
          discount: Number.parseFloat(item.discount || '0') || 0,
        })),
      };

      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          const nextErrors = result.errors ?? (result.message ? [result.message] : ['Unable to create billing session.']);
          setSubmitErrors(nextErrors);
          return;
        }

        setForm({ ...INITIAL_FORM, date: TODAY_ISO });
        onSuccess?.(result.data);
      } catch (error) {
        setSubmitErrors(['Unexpected error while creating session.']);
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSuccess],
  );

  if (mode === 'view' && session) {
    return (
      <SessionView
        session={session}
        onBack={onCancel}
        onUpdated={onUpdated}
      />
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Create Billing Session</h2>
          <p className="text-sm text-slate-600">
            Choose treatments, adjust pricing, and generate a professional invoice for the patient.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
        >
          Cancel
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Appointment (optional)</label>
            <Select
              value={form.appointmentId}
              onChange={handleAppointmentSelect}
              options={[{ value: '', label: 'No appointment' }, ...appointmentOptions]}
              placeholder="Select appointment"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</label>
            <Select
              value={form.patientId}
              onChange={(value) => setForm((previous) => ({ ...previous, patientId: value }))}
              options={patientOptions}
              placeholder="Select patient"
              disabled={Boolean(form.appointmentId)}
              />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session Discount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discount}
              onChange={(event) => setForm((previous) => ({ ...previous, discount: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Treatment notes, payment details, etc."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Treatments</h3>
              <p className="text-xs text-slate-500">Add treatments, adjust prices, and apply discounts per treatment.</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 sm:text-right">
                {form.items.length} selected
              </span>
              <button
                type="button"
                onClick={() => setTreatmentPickerOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
              >
                + Add Treatments
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Medicines</h3>
              <p className="text-xs text-slate-500">Add medicines from inventory to include them in this billing session.</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 sm:text-right">
                {form.medicineItems.length} selected
              </span>
              <button
                type="button"
                onClick={() => setMedicinePickerOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
              >
                + Add Medicines
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Invoice Items</h3>
            <p className="text-xs text-slate-500">Review every treatment and medicine added to this session before invoicing.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {editableLineItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No invoice items yet. Add treatments or medicines using the buttons above.
                    </td>
                  </tr>
                ) : null}
                {editableLineItems.map((item) => {
                  const quantity = Number.parseInt(item.quantity, 10) || 0;
                  const unitPrice = Number.parseFloat(item.unitPrice) || 0;
                  const discount = Number.parseFloat(item.discount) || 0;
                  const gross = quantity * unitPrice;
                  const total = Math.max(0, gross - discount);

                  return (
                    <tr key={`${item.kind}-${item.tempId}`} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.kind === 'treatment' ? 'Treatment' : 'Medicine'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.code || '—'}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => handleLineItemChange(item, 'quantity', event.target.value)}
                          disabled={item.isLocked}
                          className={`w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${item.kind === 'treatment' ? 'focus:border-sky-500 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-emerald-200'} ${item.isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => handleLineItemChange(item, 'unitPrice', event.target.value)}
                          disabled={item.isLocked}
                          className={`w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${item.kind === 'treatment' ? 'focus:border-sky-500 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-emerald-200'} ${item.isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(event) => handleLineItemChange(item, 'discount', event.target.value)}
                          disabled={item.isLocked}
                          className={`w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${item.kind === 'treatment' ? 'focus:border-sky-500 focus:ring-sky-200' : 'focus:border-emerald-500 focus:ring-emerald-200'} ${item.isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleLineItemRemove(item)}
                          disabled={item.isLocked}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {treatmentsSubtotal > 0 ? (
              <div className="flex w-full max-w-sm items-center justify-between">
                <span>Treatments</span>
                <span className="font-semibold text-slate-900">{formatCurrency(treatmentsSubtotal)}</span>
              </div>
            ) : null}
            {medicinesSubtotal > 0 ? (
              <div className="flex w-full max-w-sm items-center justify-between">
                <span>Medicines</span>
                <span className="font-semibold text-slate-900">{formatCurrency(medicinesSubtotal)}</span>
              </div>
            ) : null}
            <div className="flex w-full max-w-sm items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatCurrency(sessionSubtotal)}</span>
            </div>
            <div className="flex w-full max-w-sm items-center justify-between">
              <span>Session Discount</span>
              <span className="font-semibold text-slate-900">{formatCurrency(sessionDiscount)}</span>
            </div>
            <div className="flex w-full max-w-sm items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-base font-semibold text-slate-900">Total</span>
              <span className="text-base font-semibold text-slate-900">{formatCurrency(sessionTotal)}</span>
            </div>
          </div>
        </div>

        {submitErrors.length > 0 ? (
          <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {submitErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={
              isSubmitting || (form.items.length === 0 && form.medicineItems.length === 0)
            }
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
      <TreatmentPickerModal
        isOpen={isTreatmentPickerOpen}
        treatments={availableTreatments}
        selectedTreatmentIds={form.items.map((item) => item.treatmentId)}
        onAdd={handleTreatmentPickerAdd}
        onClose={handleTreatmentPickerClose}
        onCreateTreatment={handleCreateTreatmentClick}
      />
      <TreatmentModal
        isOpen={isTreatmentModalOpen}
        onClose={handleTreatmentModalClose}
        onSuccess={handleTreatmentModalSuccess}
        initialTreatment={null}
      />
      <MedicinePickerModal
        isOpen={isMedicinePickerOpen}
        medicines={availableMedicines}
        selectedMedicineIds={form.medicineItems.map((item) => item.medicineId)}
        onAdd={handleMedicinePickerAdd}
        onClose={handleMedicinePickerClose}
        onCreateMedicine={handleCreateMedicineClick}
      />
      <StockModal
        isOpen={isMedicineModalOpen}
        onClose={handleMedicineModalClose}
        onSuccess={handleMedicineModalSuccess}
        initialStock={null}
        medicineTypes={availableMedicineTypes}
      />
    </div>
  );
}
