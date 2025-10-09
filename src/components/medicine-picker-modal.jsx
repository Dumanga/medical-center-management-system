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

export default function MedicinePickerModal({
  isOpen,
  medicines,
  selectedMedicineIds = [],
  onAdd,
  onClose,
  onCreateMedicine,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [enrichedMedicines, setEnrichedMedicines] = useState(medicines ?? []);
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

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Keep local copy in sync
  useEffect(() => {
    setEnrichedMedicines(medicines ?? []);
  }, [medicines]);

  // On open, fetch latest stock quantities and merge into local list (frontend-only enhancement)
  useEffect(() => {
    if (!isOpen) return;
    let abort = false;
    (async () => {
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '1000' });
        const response = await fetch(`/api/stocks?${params.toString()}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.data) return;
        const qtyById = new Map(payload.data.map((s) => [String(s.id), Number(s.quantity) || 0]));
        if (!abort) {
          setEnrichedMedicines((prev) => (prev || []).map((m) => ({
            ...m,
            quantity: qtyById.has(String(m.id)) ? qtyById.get(String(m.id)) : (Number(m.quantity) || 0),
          })));
        }
      } catch (_err) {
        // ignore; fallback to provided quantities
      }
    })();
    return () => { abort = true; };
  }, [isOpen]);

  const selectedIdsSet = useMemo(
    () => new Set(selectedMedicineIds.map((id) => String(id))),
    [selectedMedicineIds],
  );

  const filteredMedicines = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return enrichedMedicines;
    }

    return enrichedMedicines.filter((medicine) => {
      const name = medicine.name?.toLowerCase?.() ?? '';
      const code = medicine.code?.toLowerCase?.() ?? '';
      const typeName = medicine.type?.name?.toLowerCase?.() ?? '';
      return name.includes(query) || code.includes(query) || typeName.includes(query);
    });
  }, [enrichedMedicines, searchTerm]);

  const handleAdd = useCallback(
    (medicine) => {
      if (!medicine) {
        return;
      }
      onAdd?.(medicine);
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
            <h2 className="text-xl font-semibold text-slate-900">Add Medicines</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search existing inventory, review pricing, and add medicines to this billing session.
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
                placeholder="Search medicines by name, code, or type"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-400 hover:text-emerald-500"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCreateMedicine}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
            >
              + New Medicine
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100">
            <div className="overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredMedicines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No medicines match your search. Adjust the keywords or create a new stock item.
                        </td>
                      </tr>
                    ) : (
                      filteredMedicines.map((medicine) => {
                        const isAdded = selectedIdsSet.has(String(medicine.id));
                        return (
                          <tr key={medicine.id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{medicine.name}</td>
                            <td className="px-4 py-3 text-slate-500">{medicine.code}</td>
                            <td className="px-4 py-3 text-slate-500">{medicine.type?.name ?? '—'}</td>
                            <td className="px-4 py-3">{medicine.quantity ?? 0}</td>
                            <td className="px-4 py-3">
                              {(() => {
                                const q = Number(medicine.quantity) || 0;
                                let bg = 'bg-emerald-50', text = 'text-emerald-700', ring = 'ring-emerald-200', label = 'Good';
                                if (q <= 10) { bg = 'bg-rose-50'; text = 'text-rose-700'; ring = 'ring-rose-200'; label = 'Low'; }
                                else if (q <= 20) { bg = 'bg-amber-50'; text = 'text-amber-700'; ring = 'ring-amber-200'; label = 'Medium'; }
                                return (
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${bg} ${text} ${ring}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatCurrency(Number(medicine.sellingPrice ?? 0))}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleAdd(medicine)}
                                disabled={isAdded}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400"
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
