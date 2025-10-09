'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from './ui/select';

const INITIAL_FORM = {
  medicineTypeId: '',
  code: '',
  name: '',
  quantity: '',
  incomingPrice: '',
  sellingPrice: '',
};

export default function StockModal({ isOpen, onClose, onSuccess, initialStock, medicineTypes }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);

  const isEditing = useMemo(() => Boolean(initialStock?.id), [initialStock?.id]);
  const hasTypes = Array.isArray(medicineTypes) && medicineTypes.length > 0;

  const getStatus = useCallback((quantity) => {
    const q = Number(quantity) || 0;
    if (q <= 10) {
      return { label: 'Low', bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' };
    }
    if (q <= 20) {
      return { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' };
    }
    return { label: 'Good', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' };
  }, []);

  const typeOptions = useMemo(
    () => medicineTypes.map((type) => ({ value: String(type.id), label: type.name })),
    [medicineTypes],
  );

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setErrors([]);
      setSubmitting(false);
      return;
    }

    if (initialStock) {
      setForm({
        medicineTypeId: initialStock.medicineTypeId ? String(initialStock.medicineTypeId) : '',
        code: initialStock.code ?? '',
        name: initialStock.name ?? '',
        quantity: initialStock.quantity != null ? String(initialStock.quantity) : '',
        incomingPrice:
          initialStock.incomingPrice != null ? String(Number(initialStock.incomingPrice).toFixed(2)) : '',
        sellingPrice:
          initialStock.sellingPrice != null ? String(Number(initialStock.sellingPrice).toFixed(2)) : '',
      });
    } else {
      setForm((previous) => ({
        ...INITIAL_FORM,
        medicineTypeId: hasTypes ? String(medicineTypes[0].id) : '',
      }));
    }
    setErrors([]);
  }, [initialStock, isOpen, hasTypes, medicineTypes]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }, []);

  const handleTypeSelect = useCallback((nextValue) => {
    setForm((previous) => ({ ...previous, medicineTypeId: nextValue }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!hasTypes) {
        return;
      }

      setSubmitting(true);
      setErrors([]);

      try {
        const endpoint = isEditing ? `/api/stocks/${initialStock.id}` : '/api/stocks';
        const method = isEditing ? 'PATCH' : 'POST';

        const payload = {
          medicineTypeId: form.medicineTypeId ? Number(form.medicineTypeId) : null,
          code: form.code,
          name: form.name,
          quantity: form.quantity ? Number(form.quantity) : null,
          incomingPrice: form.incomingPrice,
          sellingPrice: form.sellingPrice,
        };

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          const nextErrors = result.errors ?? (result.message ? [result.message] : ['Unable to save stock item.']);
          setErrors(nextErrors);
          return;
        }

        onSuccess?.({
          stock: result.data,
          mode: isEditing ? 'update' : 'create',
        });
      } catch (error) {
        setErrors(['Unexpected error while saving stock item.']);
      } finally {
        setSubmitting(false);
      }
    },
    [form.code, form.incomingPrice, form.medicineTypeId, form.name, form.quantity, form.sellingPrice, hasTypes, initialStock, isEditing, onSuccess],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Update Stock Item' : 'Add Stock Item'}</h2>
            <p className="text-sm text-slate-600">
              {isEditing
                ? 'Adjust inventory details to keep your stock accurate.'
                : 'Record new medicine inventory with pricing to manage availability.'}
            </p>
          </div>
        </header>

        {!hasTypes ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Add at least one medicine type before creating stock entries.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label htmlFor="stock-type" className="block text-sm font-medium text-slate-700">
              Medicine Type <span className="text-rose-500">*</span>
            </label>
            <Select
              id="stock-type"
              name="medicineTypeId"
              value={form.medicineTypeId}
              onChange={handleTypeSelect}
              options={typeOptions}
              disabled={!hasTypes}
              placeholder={hasTypes ? 'Select medicine type' : 'No types available'}
              className="mt-2 w-full"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="stock-code" className="block text-sm font-medium text-slate-700">
              Medicine Code <span className="text-rose-500">*</span>
            </label>
            <input
              id="stock-code"
              name="code"
              type="text"
              value={form.code}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. MED-001"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="stock-name" className="block text-sm font-medium text-slate-700">
              Medicine Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="stock-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. Paracetamol 500mg"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="stock-quantity" className="block text-sm font-medium text-slate-700">
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              id="stock-quantity"
              name="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. 40"
            />
            {form.quantity !== '' ? (
              <div className="mt-2">
                {(() => {
                  const s = getStatus(form.quantity);
                  return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}>
                      {s.label}
                    </span>
                  );
                })()}
              </div>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="stock-incoming" className="block text-sm font-medium text-slate-700">
              Incoming Price (per unit) <span className="text-rose-500">*</span>
            </label>
            <input
              id="stock-incoming"
              name="incomingPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.incomingPrice}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. 45.00"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="stock-selling" className="block text-sm font-medium text-slate-700">
              Selling Price (per unit) <span className="text-rose-500">*</span>
            </label>
            <input
              id="stock-selling"
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. 75.00"
            />
          </div>

          {errors.length > 0 ? (
            <div className="sm:col-span-2 space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasTypes}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Stock' : 'Save Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
