'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PatientModal from './patient-modal';

const DEFAULT_META = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,
  query: '',
};

export default function PatientsView({ initialData, initialMeta }) {
  const [patients, setPatients] = useState(initialData ?? []);
  const [meta, setMeta] = useState({ ...DEFAULT_META, ...(initialMeta ?? {}) });
  const [searchTerm, setSearchTerm] = useState(initialMeta?.query ?? '');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const searchDebounceRef = useRef();
  const hasMountedRef = useRef(false);
  const fetchPatientsRef = useRef();

  useEffect(() => {
    setPatients(initialData ?? []);
    setMeta({ ...DEFAULT_META, ...(initialMeta ?? {}) });
    setSearchTerm(initialMeta?.query ?? '');
  }, [initialData, initialMeta]);

  const fetchPatients = useCallback(
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

        const response = await fetch(`/api/patients?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Unable to load patients.');
        }

        const payload = await response.json();
        setPatients(payload.data ?? []);
        setMeta({ ...DEFAULT_META, ...(payload.meta ?? {}) });
      } catch (requestError) {
        setError(requestError.message ?? 'Unable to load patients.');
      } finally {
        setLoading(false);
      }
    },
    [meta.page, meta.pageSize, searchTerm],
  );

  useEffect(() => {
    fetchPatientsRef.current = fetchPatients;
  }, [fetchPatients]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchPatientsRef.current?.({ page: 1, query: searchTerm.trim() });
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingPatient(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((patient) => {
    setEditingPatient(patient);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingPatient(null);
  }, []);

  const handleModalSuccess = useCallback(
    async ({ mode }) => {
      handleModalClose();
      const nextQuery = searchTerm.trim();
      const nextPage = mode === 'update' ? meta.page : 1;
      await fetchPatientsRef.current?.({ page: nextPage, query: nextQuery });
    },
    [handleModalClose, meta.page, searchTerm],
  );

  const handleSearchSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      await fetchPatientsRef.current?.({ page: 1, query: searchTerm.trim() });
    },
    [searchTerm],
  );

  const handlePageChange = useCallback(
    async (nextPage) => {
      await fetchPatientsRef.current?.({ page: nextPage, query: searchTerm.trim() });
    },
    [searchTerm],
  );

  const totalPages = useMemo(() => meta.totalPages ?? DEFAULT_META.totalPages, [meta.totalPages]);
  const currentPage = useMemo(() => meta.page ?? DEFAULT_META.page, [meta.page]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-600">Manage patient records, contact information, and quick onboarding.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          + Add Patient
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search patients by name, phone, or email"
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
            Total patients: <span className="font-semibold text-slate-700">{meta.totalCount}</span>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">ID</th>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Phone</th>
                <th scope="col" className="px-4 py-3">Loyalty Points</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">Address</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {patients.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No patients found. Add a new patient to get started.
                  </td>
                </tr>
              ) : null}
              {patients.map((patient) => (
                <tr key={patient.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{patient.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{patient.name}</td>
                  <td className="px-4 py-3">{patient.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{(Number(patient.loyaltyPoints ?? 0) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-500">{patient.email ?? '--'}</td>
                  <td className="px-4 py-3 text-slate-500">{patient.address ?? '--'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(patient)}
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
          <p className="mt-4 text-sm text-slate-500">Loading patients...</p>
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

      <PatientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        initialPatient={editingPatient}
      />
    </section>
  );
}
