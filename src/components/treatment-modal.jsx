'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const INITIAL_FORM = {
  code: '',
  name: '',
  price: '',
};

export default function TreatmentModal({ isOpen, onClose, onSuccess, initialTreatment }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);

  const isEditing = useMemo(() => Boolean(initialTreatment?.id), [initialTreatment?.id]);

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setErrors([]);
      setSubmitting(false);
      return;
    }

    if (initialTreatment) {
      const priceValue = initialTreatment.price ? Number(initialTreatment.price) : '';
      setForm({
        code: initialTreatment.code ?? '',
        name: initialTreatment.name ?? '',
        price: priceValue === '' || Number.isNaN(priceValue) ? '' : priceValue.toFixed(2),
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors([]);
  }, [initialTreatment, isOpen]);

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
        const endpoint = isEditing ? `/api/treatments/${initialTreatment.id}` : '/api/treatments';
        const method = isEditing ? 'PATCH' : 'POST';

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: form.code,
            name: form.name,
            price: form.price,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const messages = payload.errors ?? (payload.message ? [payload.message] : ['Unable to save treatment.']);
          setErrors(messages);
          return;
        }

        setForm(INITIAL_FORM);
        onSuccess?.({
          treatment: payload.data,
          mode: isEditing ? 'update' : 'create',
        });
      } catch (error) {
        setErrors(['Unexpected error while saving treatment.']);
      } finally {
        setSubmitting(false);
      }
    },
    [form.code, form.name, form.price, initialTreatment, isEditing, onSuccess],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Update Treatment' : 'Add New Treatment'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isEditing
                ? 'Adjust treatment details and keep your catalog accurate.'
                : 'Add a treatment to make it available for sessions and billing.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="treatment-code" className="block text-sm font-medium text-slate-700">
              Treatment Code <span className="text-rose-500">*</span>
            </label>
            <input
              id="treatment-code"
              name="code"
              type="text"
              value={form.code}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm uppercase tracking-wide text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. TRT001"
            />
          </div>

          <div>
            <label htmlFor="treatment-name" className="block text-sm font-medium text-slate-700">
              Treatment Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="treatment-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. General Consultation"
            />
          </div>

          <div>
            <label htmlFor="treatment-price" className="block text-sm font-medium text-slate-700">
              Price (LKR) <span className="text-rose-500">*</span>
            </label>
            <input
              id="treatment-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. 2500.00"
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Treatment' : 'Save Treatment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

