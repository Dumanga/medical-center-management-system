'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SessionEditor from './session-editor';

const DEFAULT_META = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,
  query: '',
};

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

export default function SessionsView({
  initialData,
  initialMeta,
  patients,
  treatments,
  medicines,
  medicineTypes,
  appointments,
}) {
  const [sessions, setSessions] = useState(initialData ?? []);
  const [meta, setMeta] = useState({ ...DEFAULT_META, ...(initialMeta ?? {}) });
  const [searchTerm, setSearchTerm] = useState(initialMeta?.query ?? '');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('list'); // list | create | view
  const [activeSession, setActiveSession] = useState(null);
  const [currentPatients, setCurrentPatients] = useState(patients ?? []);
  const [currentAppointments, setCurrentAppointments] = useState(appointments ?? []);
  const [currentMedicines, setCurrentMedicines] = useState(medicines ?? []);
  const [currentMedicineTypes, setCurrentMedicineTypes] = useState(medicineTypes ?? []);

  const fetchRef = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    setSessions(initialData ?? []);
    setMeta({ ...DEFAULT_META, ...(initialMeta ?? {}) });
    setSearchTerm(initialMeta?.query ?? '');
    setCurrentPatients(patients ?? []);
    setCurrentAppointments(appointments ?? []);
    setCurrentMedicines(medicines ?? []);
    setCurrentMedicineTypes(medicineTypes ?? []);
  }, [initialData, initialMeta, patients, appointments, medicines, medicineTypes]);

  const fetchSessions = useCallback(
    async ({ page, query } = {}) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.set('page', String(page ?? meta.page ?? DEFAULT_META.page));
        params.set('pageSize', String(meta.pageSize ?? DEFAULT_META.pageSize));
        const nextQuery = typeof query === 'string' ? query : searchTerm;
        if (nextQuery) {
          params.set('query', nextQuery);
        }

        const response = await fetch(`/api/sessions?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Unable to load billing sessions.');
        }

        const payload = await response.json();
        setSessions(payload.data ?? []);
        setMeta({ ...DEFAULT_META, ...(payload.meta ?? {}) });
      } catch (fetchError) {
        setError(fetchError.message ?? 'Unable to load billing sessions.');
      } finally {
        setLoading(false);
      }
    },
    [meta.page, meta.pageSize, searchTerm],
  );

  useEffect(() => {
    fetchRef.current = fetchSessions;
  }, [fetchSessions]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchRef.current?.({ page: 1, query: searchTerm.trim() });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleSearchSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      await fetchRef.current?.({ page: 1, query: searchTerm.trim() });
    },
    [searchTerm],
  );

  const handlePageChange = useCallback(
    async (page) => {
      await fetchRef.current?.({ page });
    },
    [],
  );

  const handleCreateClick = useCallback(() => {
    setMode('create');
  }, []);

  const handleViewSession = useCallback((session) => {
    setActiveSession(session);
    setMode('view');
  }, []);

  const handleCancelEditor = useCallback(() => {
    setActiveSession(null);
    setMode('list');
  }, []);

  const handleCreateSuccess = useCallback(
    async (session) => {
      await fetchRef.current?.({ page: 1 });
      setMode('list');
      setActiveSession(null);
      if (session?.id) {
        window.open(`/api/sessions/${session.id}/invoice`, '_blank', 'noopener');
      }
    },
    [],
  );

  const handleFetchPatients = useCallback(async () => {
    try {
      const response = await fetch('/api/patients?page=1&pageSize=100', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (Array.isArray(payload.data)) {
        setCurrentPatients(payload.data);
      }
    } catch (fetchError) {
      console.error('Failed to refresh patient list', fetchError);
    }
  }, []);

  const handleFetchAppointments = useCallback(async () => {
    try {
      const response = await fetch('/api/appointments?page=1&pageSize=100&status=PENDING', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (Array.isArray(payload.data)) {
        setCurrentAppointments(payload.data);
      }
    } catch (fetchError) {
      console.error('Failed to refresh appointment list', fetchError);
    }
  }, []);

  const handleFetchMedicines = useCallback(async () => {
    try {
      const response = await fetch('/api/stocks?page=1&pageSize=200', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (Array.isArray(payload.data)) {
        const formatted = payload.data.map((medicine) => ({
          id: medicine.id,
          name: medicine.name,
          code: medicine.code,
          sellingPrice: Number(medicine.sellingPrice ?? 0),
          type: medicine.type,
        }));
        setCurrentMedicines(formatted);
      }
    } catch (fetchError) {
      console.error('Failed to refresh medicine list', fetchError);
    }
  }, []);

  const handleFetchMedicineTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/stock-types', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (Array.isArray(payload.data)) {
        const formatted = payload.data.map((type) => ({ id: type.id, name: type.name }));
        setCurrentMedicineTypes(formatted);
      }
    } catch (fetchError) {
      console.error('Failed to refresh medicine types', fetchError);
    }
  }, []);

  const totalPages = meta.totalPages ?? DEFAULT_META.totalPages;
  const currentPage = meta.page ?? DEFAULT_META.page;

  const listView = (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Billing Sessions</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track invoices, apply discounts, and generate printable PDFs for each patient session.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => {
              handleFetchPatients();
              handleFetchAppointments();
              handleFetchMedicines();
              handleFetchMedicineTypes();
              handleCreateClick();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            + Create Session
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by session id, patient, or notes"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            >
              Search
            </button>
          </form>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Treatments</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {sessions.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No billing sessions recorded yet. Create a session to generate your first invoice.
                  </td>
                </tr>
              ) : null}
              {sessions.map((session) => (
                <tr key={session.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    #{session.id}
                    <div className="mt-1 text-[11px] text-slate-400">
                      {session.description || 'No notes'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{session.patient?.name ?? 'Unknown patient'}</div>
                    <div className="text-xs text-slate-500">{session.patient?.phone ?? '--'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {(session.items?.length ?? 0) + (session.medicineItems?.length ?? 0)} items
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatCurrency(session.discount ?? 0)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(session.total ?? 0)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {session.date ? new Date(session.date).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewSession(session)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/api/sessions/${session.id}/invoice`, '_blank', 'noopener')}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-slate-500">Loading sessions...</p> : null}

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
    </section>
  );

  const createView = (
    <SessionEditor
      mode="create"
      patients={currentPatients}
      treatments={treatments}
      medicines={currentMedicines}
      medicineTypes={currentMedicineTypes}
      appointments={currentAppointments}
      onCancel={handleCancelEditor}
      onSuccess={handleCreateSuccess}
    />
  );

  const detailView = (
    <SessionEditor
      mode="view"
      session={activeSession}
      patients={currentPatients}
      treatments={treatments}
      medicines={currentMedicines}
      medicineTypes={currentMedicineTypes}
      appointments={currentAppointments}
      onCancel={handleCancelEditor}
    />
  );

  if (mode === 'create') {
    return <section className="space-y-6">{createView}</section>;
  }

  if (mode === 'view' && activeSession) {
    return <section className="space-y-6">{detailView}</section>;
  }

  return listView;
}
