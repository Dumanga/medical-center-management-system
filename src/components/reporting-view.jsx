'use client';

import { useCallback, useMemo, useState } from 'react';

function formatDateInput(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

function formatCurrency(value) {
  try {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(
      Number(value || 0),
    );
  } catch {
    return `LKR ${(Number(value || 0)).toFixed(2)}`;
  }
}

export default function ReportingView() {
  const [mode, setMode] = useState('sessions'); // 'sessions' | 'medicines'
  const [from, setFrom] = useState(formatDateInput(new Date()));
  const [to, setTo] = useState(formatDateInput(new Date()));
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const canExport = rows.length > 0;

  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError('');
    setRows([]);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const url = mode === 'sessions' ? `/api/reports/sessions?${params}` : `/api/reports/medicines?${params}`;
      const response = await fetch(url, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to build report.');
      }
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (e) {
      setError(e?.message || 'Unable to build report.');
    } finally {
      setLoading(false);
    }
  }, [from, to, mode]);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const url = mode === 'sessions' ? `/api/reports/sessions/pdf?${params}` : `/api/reports/medicines/pdf?${params}`;
    window.open(url, '_blank', 'noopener');
  }, [from, to, mode]);

  const sessionColumns = (
    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
      <tr>
        <th className="px-4 py-3">Session #</th>
        <th className="px-4 py-3">Date</th>
        <th className="px-4 py-3">Patient</th>
        <th className="px-4 py-3">Description</th>
        <th className="px-4 py-3">Total</th>
      </tr>
    </thead>
  );

  const medicineColumns = (
    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
      <tr>
        <th className="px-4 py-3">Code</th>
        <th className="px-4 py-3">Medicine</th>
        <th className="px-4 py-3">Type</th>
        <th className="px-4 py-3">Qty Sold</th>
        <th className="px-4 py-3">Revenue</th>
      </tr>
    </thead>
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Reporting</h1>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('sessions')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-inset ${
                mode === 'sessions'
                  ? 'bg-sky-600 text-white ring-sky-500'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Session Report
            </button>
            <button
              type="button"
              onClick={() => setMode('medicines')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-inset ${
                mode === 'medicines'
                  ? 'bg-sky-600 text-white ring-sky-500'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Medicine Stock Report
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? 'Generating...' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{mode === 'sessions' ? 'Session Report' : 'Medicine Stock Report'}</h2>
          {canExport ? (
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            >
              Export as PDF (A4)
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            {mode === 'sessions' ? sessionColumns : medicineColumns}
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No results yet. Select dates and click Create Report.
                  </td>
                </tr>
              ) : (
                rows.map((row) =>
                  mode === 'sessions' ? (
                    <tr key={row.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">#{row.id}</td>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.patientName}</td>
                      <td className="px-4 py-3 text-slate-500">{row.description || '--'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(row.total)}</td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.code}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 text-slate-500">{row.typeName || '--'}</td>
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

