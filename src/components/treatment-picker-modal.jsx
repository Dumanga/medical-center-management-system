'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

export default function TreatmentPickerModal({
  isOpen,
  treatments,
  selectedTreatmentIds = [],
  onAdd,
  onClose,
  onCreateTreatment,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedIdsSet = useMemo(() => new Set(selectedTreatmentIds.map((id) => String(id))), [selectedTreatmentIds]);

  const filteredTreatments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return treatments;
    }

    return treatments.filter((treatment) => {
      const name = treatment.name?.toLowerCase?.() ?? '';
      const code = treatment.code?.toLowerCase?.() ?? '';
      return name.includes(query) || code.includes(query);
    });
  }, [searchTerm, treatments]);

  const handleAdd = useCallback(
    (treatment) => {
      if (!treatment) {
        return;
      }
      onAdd?.(treatment);
    },
    [onAdd],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Treatments</h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse existing treatments, search by name or code, and add them to this billing session.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search treatments by name or code"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-400 hover:text-sky-500"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCreateTreatment}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            >
              + New Treatment
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100">
            <div className="overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Treatment</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredTreatments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No treatments match your search. Adjust the filters or create a new treatment.
                        </td>
                      </tr>
                    ) : (
                      filteredTreatments.map((treatment) => {
                        const isAdded = selectedIdsSet.has(String(treatment.id));
                        return (
                          <tr key={treatment.id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{treatment.name}</td>
                            <td className="px-4 py-3 text-slate-500">{treatment.code}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatCurrency(Number(treatment.price ?? 0))}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleAdd(treatment)}
                                disabled={isAdded}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {isAdded ? 'Added' : 'Add'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

