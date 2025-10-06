'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppointmentModal from './appointment-modal';
import DatePicker from '@/components/ui/date-picker';

const DEFAULT_META = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,
  query: '',
  from: null,
  to: null,
};

function formatPatientDisplay(patient) {
  if (!patient) {
    return 'Unknown patient';
  }
  if (patient.phone) {
    return `${patient.name} (${patient.phone})`;
  }
  return patient.name;
}

export default function AppointmentsView({ initialData, initialMeta }) {
  const [appointments, setAppointments] = useState(initialData ?? []);
  const [meta, setMeta] = useState({ ...DEFAULT_META, ...(initialMeta ?? {}) });
  const [searchTerm, setSearchTerm] = useState(initialMeta?.query ?? '');
  const [fromDate, setFromDate] = useState(initialMeta?.from ?? '');
  const [toDate, setToDate] = useState(initialMeta?.to ?? '');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setAppointments(initialData ?? []);
    setMeta({ ...DEFAULT_META, ...(initialMeta ?? {}) });
    setSearchTerm(initialMeta?.query ?? '');
    setFromDate(initialMeta?.from ?? '');
    setToDate(initialMeta?.to ?? '');
  }, [initialData, initialMeta]);

  const fetchAppointments = useCallback(
    async ({ page, query, from, to } = {}) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        const nextPage = page ?? meta.page ?? DEFAULT_META.page;
        const nextQuery = typeof query === 'string' ? query : searchTerm;
        const nextFrom = typeof from === 'string' ? from : fromDate;
        const nextTo = typeof to === 'string' ? to : toDate;
        const pageSize = meta.pageSize ?? DEFAULT_META.pageSize;

        params.set('page', String(nextPage));
        params.set('pageSize', String(pageSize));
        if (nextQuery) {
          params.set('query', nextQuery);
        }
        if (nextFrom) {
          params.set('from', nextFrom);
        }
        if (nextTo) {
          params.set('to', nextTo);
        }

        const response = await fetch(`/api/appointments?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || 'Unable to load appointments.');
        }

        setAppointments(payload.data ?? []);
        setMeta({ ...DEFAULT_META, ...(payload.meta ?? {}), pageSize });
      } catch (requestError) {
        setError(requestError.message ?? 'Unable to load appointments.');
      } finally {
        setLoading(false);
      }
    },
    [fromDate, meta.page, meta.pageSize, searchTerm, toDate],
  );

  const handleOpenCreateModal = useCallback(() => {
    setEditingAppointment(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((appointment) => {
    setEditingAppointment(appointment);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingAppointment(null);
  }, []);

  const handleModalSuccess = useCallback(
    async ({ mode }) => {
      handleModalClose();
      const nextPage = mode === 'update' ? meta.page : 1;
      await fetchAppointments({ page: nextPage });
    },
    [fetchAppointments, handleModalClose, meta.page],
  );

  const handleApplyFilters = useCallback(
    async (event) => {
      event?.preventDefault();
      await fetchAppointments({ page: 1 });
    },
    [fetchAppointments],
  );

  const handleClearFilters = useCallback(
    async () => {
      setSearchTerm('');
      setFromDate('');
      setToDate('');
      await fetchAppointments({ page: 1, query: '', from: '', to: '' });
    },
    [fetchAppointments],
  );

  const handlePageChange = useCallback(
    async (page) => {
      await fetchAppointments({ page });
    },
    [fetchAppointments],
  );

  const handleDelete = useCallback(
    async (appointmentId) => {
      if (!appointmentId) {
        return;
      }

      const confirmation = window.confirm('Are you sure you want to delete this appointment?');
      if (!confirmation) {
        return;
      }

      setDeletingId(appointmentId);
      setError('');

      try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Unable to delete appointment.');
        }

        const nextPage = appointments.length === 1 && meta.page > 1 ? meta.page - 1 : meta.page;
        await fetchAppointments({ page: nextPage });
      } catch (requestError) {
        setError(requestError.message ?? 'Unable to delete appointment.');
      } finally {
        setDeletingId(null);
      }
    },
    [appointments.length, fetchAppointments, meta.page],
  );

  const totalPages = useMemo(() => meta.totalPages ?? DEFAULT_META.totalPages, [meta.totalPages]);
  const currentPage = useMemo(() => meta.page ?? DEFAULT_META.page, [meta.page]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Schedule, reschedule, and track patient visits with quick access to upcoming bookings.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          + Create Appointment
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <form onSubmit={handleApplyFilters} className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <label htmlFor="appointment-search" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </label>
            <input
              id="appointment-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by patient name, phone, or notes"
              className="mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              From Date
            </label>
            <div className="mt-2">
              <DatePicker
                value={fromDate}
                onChange={(next) => setFromDate(next)}
                max={toDate || undefined}
                allowClear
                placeholder="Any date"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              To Date
            </label>
            <div className="mt-2">
              <DatePicker
                value={toDate}
                onChange={(next) => setToDate(next)}
                min={fromDate || undefined}
                allowClear
                placeholder="Any date"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Reset
          </button>
        </form>

        <div className="mt-3 text-xs text-slate-500">
          Total appointments: <span className="font-semibold text-slate-700">{meta.totalCount}</span>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">ID</th>
                <th scope="col" className="px-4 py-3">Patient</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Time</th>
                <th scope="col" className="px-4 py-3">Notes</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {appointments.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No appointments found. Create a new appointment to get started.
                  </td>
                </tr>
              ) : null}
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{appointment.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatPatientDisplay(appointment.patient)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {appointment.date}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{appointment.time}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {appointment.notes ? (
                      <span className="line-clamp-2">{appointment.notes}</span>
                    ) : (
                      <span className="italic text-slate-400">No notes</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(appointment)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(appointment.id)}
                        disabled={deletingId === appointment.id}
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === appointment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading appointments...</p>
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

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        initialAppointment={editingAppointment}
      />
    </section>
  );
}



