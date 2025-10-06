'use client';

import { useCallback, useEffect, useState } from 'react';

export default function StockTypeManager({ isOpen, onClose, types, onRefresh }) {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setErrors([]);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleAddType = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitting(true);
      setErrors([]);

      try {
        const response = await fetch('/api/stock-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const messages = payload.errors ?? (payload.message ? [payload.message] : ['Unable to add medicine type.']);
          setErrors(messages);
          return;
        }

        setName('');
        await onRefresh?.();
      } catch (error) {
        setErrors(['Unexpected error while adding medicine type.']);
      } finally {
        setSubmitting(false);
      }
    },
    [name, onRefresh],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Manage Medicine Types</h2>
            <p className="text-sm text-slate-600">Create reusable categories to organise your stock list.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleAddType} className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1">
            <label htmlFor="medicine-type-name" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              New Medicine Type
            </label>
            <input
              id="medicine-type-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Tablets"
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Adding...' : 'Add Type'}
          </button>
        </form>

        {errors.length > 0 ? (
          <div className="mt-3 space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {errors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Existing Types</span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="px-4 py-3">Stock Items</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No medicine types yet. Add your first type above.</td>
                  </tr>
                ) : null}
                {types.map((type) => (
                  <tr key={type.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{type.name}</td>
                    <td className="px-4 py-3 text-slate-500">{type.stockCount ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {type.createdAt ? new Date(type.createdAt).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

