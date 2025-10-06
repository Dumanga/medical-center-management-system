'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StockModal from './stock-modal';
import StockTypeManager from './stock-type-manager';
import Select from './ui/select';

const DEFAULT_META = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,
  query: '',
  typeId: null,
  inventoryValue: 0,
  expectedRevenue: 0,
};

function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'LKR 0.00';
  }

  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `LKR ${Number(amount).toFixed(2)}`;
  }
}

export default function StocksView({ initialData, initialMeta, initialTypes }) {
  const [stocks, setStocks] = useState(initialData ?? []);
  const [meta, setMeta] = useState({ ...DEFAULT_META, ...(initialMeta ?? {}) });
  const [types, setTypes] = useState(initialTypes ?? []);
  const [searchTerm, setSearchTerm] = useState(initialMeta?.query ?? '');
  const [selectedTypeId, setSelectedTypeId] = useState(
    initialMeta?.typeId ? String(initialMeta.typeId) : '',
  );
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStockModalOpen, setStockModalOpen] = useState(false);
  const [isTypeModalOpen, setTypeModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);

  const searchDebounceRef = useRef();
  const hasMountedRef = useRef(false);
  const fetchStocksRef = useRef();

  useEffect(() => {
    setStocks(initialData ?? []);
    setMeta({ ...DEFAULT_META, ...(initialMeta ?? {}) });
    setTypes(initialTypes ?? []);
    setSearchTerm(initialMeta?.query ?? '');
    setSelectedTypeId(initialMeta?.typeId ? String(initialMeta.typeId) : '');
  }, [initialData, initialMeta, initialTypes]);

  const refreshTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/stock-types');
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      setTypes(payload.data ?? []);
    } catch (refreshError) {
      console.error('Failed to refresh medicine types', refreshError);
    }
  }, []);

  const fetchStocks = useCallback(
    async ({ page, query, typeId } = {}) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        const nextPage = page ?? meta.page ?? DEFAULT_META.page;
        const nextQuery = typeof query === 'string' ? query : searchTerm;
        const nextTypeId =
          typeId !== undefined ? typeId : selectedTypeId ? Number(selectedTypeId) : null;
        const pageSize = meta.pageSize ?? DEFAULT_META.pageSize;

        params.set('page', String(nextPage));
        params.set('pageSize', String(pageSize));
        if (nextQuery) {
          params.set('query', nextQuery);
        }
        if (nextTypeId) {
          params.set('typeId', String(nextTypeId));
        }

        const response = await fetch(`/api/stocks?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Unable to load stock items.');
        }

        const payload = await response.json();

        const nextStocks = Array.isArray(payload.data)
          ? payload.data.map((item) => ({
              ...item,
              incomingPrice: typeof item.incomingPrice === 'number'
                ? item.incomingPrice
                : Number.parseFloat(item.incomingPrice ?? '0') || 0,
              sellingPrice: typeof item.sellingPrice === 'number'
                ? item.sellingPrice
                : Number.parseFloat(item.sellingPrice ?? '0') || 0,
            }))
          : [];

        setStocks(nextStocks);
        setMeta({ ...DEFAULT_META, ...(payload.meta ?? {}) });
      } catch (requestError) {
        setError(requestError.message ?? 'Unable to load stock items.');
      } finally {
        setLoading(false);
      }
    },
    [meta.page, meta.pageSize, searchTerm, selectedTypeId],
  );

  useEffect(() => {
    fetchStocksRef.current = fetchStocks;
  }, [fetchStocks]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchStocksRef.current?.({ page: 1, query: searchTerm.trim() });
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      return;
    }

    fetchStocksRef.current?.({ page: 1, typeId: selectedTypeId ? Number(selectedTypeId) : null });
  }, [selectedTypeId]);

  const handleSearchSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      await fetchStocksRef.current?.({ page: 1, query: searchTerm.trim() });
    },
    [searchTerm],
  );

  const handleTypeChange = useCallback((nextValue) => {
    setSelectedTypeId(nextValue);
  }, []);

  const handlePageChange = useCallback(
    async (page) => {
      await fetchStocksRef.current?.({ page });
    },
    [],
  );

  const handleOpenCreateModal = useCallback(() => {
    setEditingStock(null);
    setStockModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((stock) => {
    setEditingStock(stock);
    setStockModalOpen(true);
  }, []);

  const handleStockModalClose = useCallback(() => {
    setStockModalOpen(false);
    setEditingStock(null);
  }, []);

  const handleStockModalSuccess = useCallback(
    async ({ mode }) => {
      handleStockModalClose();
      const nextQuery = searchTerm.trim();
      const nextType = selectedTypeId ? Number(selectedTypeId) : null;
      const nextPage = mode === 'update' ? meta.page : 1;
      await fetchStocksRef.current?.({ page: nextPage, query: nextQuery, typeId: nextType });
      await refreshTypes();
    },
    [handleStockModalClose, meta.page, refreshTypes, searchTerm, selectedTypeId],
  );

  const handleTypeModalOpen = useCallback(() => {
    setTypeModalOpen(true);
  }, []);

  const handleTypeModalClose = useCallback(() => {
    setTypeModalOpen(false);
  }, []);

  const totalPages = useMemo(() => meta.totalPages ?? DEFAULT_META.totalPages, [meta.totalPages]);
  const currentPage = useMemo(() => meta.page ?? DEFAULT_META.page, [meta.page]);
  const totalItems = useMemo(() => meta.totalCount ?? 0, [meta.totalCount]);
  const totalTypes = useMemo(() => types.length ?? 0, [types]);
  const typeFilterOptions = useMemo(() => [
    { value: '', label: 'All types' },
    ...types.map((type) => ({ value: String(type.id), label: type.name })),
  ], [types]);
  const inventoryValue = useMemo(() => meta.inventoryValue ?? 0, [meta.inventoryValue]);
  const expectedRevenue = useMemo(() => meta.expectedRevenue ?? 0, [meta.expectedRevenue]);

  const hasTypes = totalTypes > 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Stocks</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track medicine inventory, pricing, and stock categories from a single view.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleTypeModalOpen}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
          >
            Manage Types
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            disabled={!hasTypes}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            + Add Stock
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Stock Items</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalItems}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medicine Types</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalTypes}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Stock Value</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(inventoryValue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(expectedRevenue)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by medicine code or name"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            >
              Search
            </button>
          </form>
          <div className="flex items-center gap-2">
            <label htmlFor="stock-type-filter" className="text-sm font-medium text-slate-600">
              Filter by type
            </label>
            <Select
              id="stock-type-filter"
              value={selectedTypeId}
              onChange={handleTypeChange}
              options={typeFilterOptions}
              className="min-w-[12rem]"
            />
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
                <th scope="col" className="px-4 py-3">Medicine</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Quantity</th>
                <th scope="col" className="px-4 py-3">Incoming Price</th>
                <th scope="col" className="px-4 py-3">Selling Price</th>
                <th scope="col" className="px-4 py-3">Updated</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {stocks.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No stock records found. {hasTypes ? 'Add a stock item to get started.' : 'Create a medicine type to begin tracking stock.'}
                  </td>
                </tr>
              ) : null}
              {stocks.map((stock) => (
                <tr key={stock.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{stock.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{stock.name}</td>
                  <td className="px-4 py-3 text-slate-500">{stock.type?.name ?? '--'}</td>
                  <td className="px-4 py-3">{stock.quantity}</td>
                  <td className="px-4 py-3 text-slate-500">{formatCurrency(stock.incomingPrice)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatCurrency(stock.sellingPrice)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {stock.updatedAt ? new Date(stock.updatedAt).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(stock)}
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
          <p className="mt-4 text-sm text-slate-500">Loading stock items...</p>
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

      <StockModal
        isOpen={isStockModalOpen}
        onClose={handleStockModalClose}
        onSuccess={handleStockModalSuccess}
        initialStock={editingStock}
        medicineTypes={types}
      />

      <StockTypeManager
        isOpen={isTypeModalOpen}
        onClose={handleTypeModalClose}
        types={types}
        onRefresh={refreshTypes}
      />
    </section>
  );
}

