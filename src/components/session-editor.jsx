'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import Select from './ui/select';
import TreatmentPickerModal from './treatment-picker-modal';
import TreatmentModal from './treatment-modal';

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
};

let tempId = 0;

function createItemFromTreatment(treatment) {
  tempId += 1;
  const price = Number(treatment.price ?? 0);
  return {
    tempId,
    treatmentId: treatment.id,
    treatmentName: treatment.name,
    quantity: '1',
    unitPrice: price.toFixed(2),
    discount: '0.00',
    total: price,
  };
}

function SessionSummary({ session }) {
  const subtotal = session.items?.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0) ?? 0;
  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
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

function SessionView({ session, onBack }) {
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
          <h3 className="text-sm font-semibold text-slate-800">Treatments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Treatment</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {session.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.treatment?.name ?? 'Treatment'}</div>
                    <div className="text-xs text-slate-500">{item.treatment?.code ?? ''}</div>
                  </td>
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
    </div>
  );
}

export default function SessionEditor({
  mode = 'create',
  session,
  patients,
  treatments,
  appointments,
  onCancel,
  onSuccess,
}) {
  const [form, setForm] = useState({ ...INITIAL_FORM, date: TODAY_ISO });
  const [submitErrors, setSubmitErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [availableTreatments, setAvailableTreatments] = useState(treatments ?? []);
  const [isTreatmentPickerOpen, setTreatmentPickerOpen] = useState(false);
  const [isTreatmentModalOpen, setTreatmentModalOpen] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      setForm({ ...INITIAL_FORM, date: TODAY_ISO });
      setSubmitErrors([]);
      setSubmitting(false);
    }
  }, [mode]);

  useEffect(() => {
    setAvailableTreatments(treatments ?? []);
  }, [treatments]);

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

  const sessionSubtotal = useMemo(
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
    return <SessionView session={session} onBack={onCancel} />;
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Treatment</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {form.items.length === 0 ? (
                  <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No treatments added yet. Use the Add Treatments button above to include them in this session.
                    </td>
                  </tr>
                ) : null}
                {form.items.map((item) => {
                  const quantity = Number.parseInt(item.quantity, 10) || 0;
                  const unitPrice = Number.parseFloat(item.unitPrice) || 0;
                  const discount = Number.parseFloat(item.discount) || 0;
                  const gross = quantity * unitPrice;
                  const total = Math.max(0, gross - discount);

                  return (
                    <tr key={item.tempId} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.treatmentName}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(item.tempId, 'quantity', event.target.value)}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-200"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => handleItemChange(item.tempId, 'unitPrice', event.target.value)}
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-200"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(event) => handleItemChange(item.tempId, 'discount', event.target.value)}
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-200"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.tempId)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50"
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
            disabled={isSubmitting || form.items.length === 0}
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
    </div>
  );
}
