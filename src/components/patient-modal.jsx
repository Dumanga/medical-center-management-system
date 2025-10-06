'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

export default function PatientModal({ isOpen, onClose, onSuccess, initialPatient }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);

  const isEditing = useMemo(() => Boolean(initialPatient?.id), [initialPatient?.id]);

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setErrors([]);
      setSubmitting(false);
      return;
    }

    if (initialPatient) {
      setForm({
        name: initialPatient.name ?? '',
        phone: initialPatient.phone ?? '',
        email: initialPatient.email ?? '',
        address: initialPatient.address ?? '',
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors([]);
  }, [initialPatient, isOpen]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitting(true);
      setErrors([]);

      try {
        const endpoint = isEditing ? `/api/patients/${initialPatient.id}` : '/api/patients';
        const method = isEditing ? 'PATCH' : 'POST';

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email,
            address: form.address,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const messages = payload.errors ?? (payload.message ? [payload.message] : ['Unable to save patient.']);
          setErrors(messages);
          return;
        }

        setForm(INITIAL_FORM);
        onSuccess?.({
          patient: payload.data,
          mode: isEditing ? 'update' : 'create',
        });
      } catch (error) {
        setErrors(['Unexpected error while saving patient.']);
      } finally {
        setSubmitting(false);
      }
    },
    [form.address, form.email, form.name, form.phone, initialPatient, isEditing, onSuccess],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Update Patient' : 'Add New Patient'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isEditing
                ? 'Modify patient contact details and save your changes.'
                : 'Capture patient contact information to streamline future appointments.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="patient-name" className="block text-sm font-medium text-slate-700">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="patient-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. John Perera"
            />
          </div>

          <div>
            <label htmlFor="patient-phone" className="block text-sm font-medium text-slate-700">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="patient-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="07XXXXXXXX"
            />
          </div>

          <div>
            <label htmlFor="patient-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="patient-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="patient-address" className="block text-sm font-medium text-slate-700">
              Address
            </label>
            <textarea
              id="patient-address"
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Optional"
            />
          </div>

          {errors.length > 0 ? (
            <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Patient' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

