'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TreatmentModal from './treatment-modal';

const DEFAULT_META = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,
  query: '',
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
});

function formatPrice(value) {
  if (value === null || value === undefined) {
    return CURRENCY_FORMATTER.format(0);
  }
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return CURRENCY_FORMATTER.format(0);
  }
  return CURRENCY_FORMATTER.format(numeric);
}

export default function TreatmentsView({ initialData, initialMeta }) {
  const [treatments, setTreatments] = useState(initialData ?? []);
  const [meta, setMeta] = useState({ ...DEFAULT_META, ...(initialMeta ?? {}) });
  const [searchTerm, setSearchTerm] = useState(initialMeta?.query ?? '');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);

  const searchDebounceRef = useRef();
  const hasMountedRef = useRef(false);
  const fetchTreatmentsRef = useRef();

  useEffect(() => {
    setTreatments(initialData ?? []);
    setMeta({ ...DEFAULT_META, ...(initialMeta ?? {}) });
    setSearchTerm(initialMeta?.query ?? '');
  }, [initialData, initialMeta]);

  const fetchTreatments = useCallback(
    async ({ page, query } = {}) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        const nextPage = page ?? meta.page ?? DEFAULT_META.page;
        const nextQuery = typeof query === 'string' ? query : searchTerm;
        const pageSize = meta.pageSize ?? DEFAULT_META.pageSize;

        params.set('page', String(nextPage));
        params.set('pageSize', String(pageSize));
        if (nextQuery) {
          params.set('query', nextQuery);
        }

        const response = await fetch(`/api/treatments?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Unable to load treatments.');
        }

        const payload = await response.json();
        setTreatments(payload.data ?? []);
        setMeta({ ...DEFAULT_META, ...(payload.meta ?? {}) });
      } catch (requestError) {
        setError(requestError.message ?? 'Unable to load treatments.');
      } finally {
        setLoading(false);
      }
    },
    [meta.page, meta.pageSize, searchTerm],
  );

  useEffect(() => {
    fetchTreatmentsRef.current = fetchTreatments;
  }, [fetchTreatments]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchTreatmentsRef.current?.({ page: 1, query: searchTerm.trim() });
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingTreatment(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((treatment) => {
    setEditingTreatment(treatment);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingTreatment(null);
  }, []);

  const handleModalSuccess = useCallback(
    async ({ mode }) => {
      handleModalClose();
      const nextQuery = searchTerm.trim();
      const nextPage = mode === 'update' ? meta.page : 1;
      await fetchTreatmentsRef.current?.({ page: nextPage, query: nextQuery });
    },
    [handleModalClose, meta.page, searchTerm],
  );

  const handleSearchSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      await fetchTreatmentsRef.current?.({ page: 1, query: searchTerm.trim() });
    },
    [searchTerm],
  );

  const handlePageChange = useCallback(
    async (nextPage) => {
      await fetchTreatmentsRef.current?.({ page: nextPage, query: searchTerm.trim() });
    },
    [searchTerm],
  );

  const totalPages = useMemo(() => meta.totalPages ?? DEFAULT_META.totalPages, [meta.totalPages]);
  const currentPage = useMemo(() => meta.page ?? DEFAULT_META.page, [meta.page]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Treatments</h1>
          <p className="mt-1 text-sm text-slate-600">Maintain an up-to-date catalog of treatments and pricing.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          + Add Treatment
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search treatments by code or name"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            >
              Search
            </button>
          </form>
          <div className="text-sm text-slate-500">
            Total treatments: <span className="font-semibold text-slate-700">{meta.totalCount}</span>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Code</th>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Price</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {treatments.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No treatments found. Add a treatment to populate the catalog.
                  </td>
                </tr>
              ) : null}
              {treatments.map((treatment) => (
                <tr key={treatment.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{treatment.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{treatment.name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPrice(treatment.price)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(treatment)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading treatments...</p>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="text-sm text-slate-500">
            Page <span className="font-semibold text-slate-700">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <TreatmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        initialTreatment={editingTreatment}
      />
    </section>
  );
}

