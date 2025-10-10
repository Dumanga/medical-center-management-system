import prisma from '@/lib/prisma';

function normalizeStatus(value) {
  return (value ?? 'PENDING').toUpperCase();
}

function getStatusClasses(status) {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case 'CONFIRMED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-700';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

function formatStatusLabel(status) {
  const normalized = normalizeStatus(status);
  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function loadDashboardSummary() {
  const fallback = {
    counts: {
      patients: 0,
      treatments: 0,
      appointmentsToday: 0,
    },
    todayAppointments: [],
    recentSessions: [],
    inventoryValue: 0,
    expectedRevenue: 0,
    hasError: false,
  };

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [patients, treatments, appointments, sessions, inventoryValueRows, expectedRevenueRows] = await Promise.all([
      prisma.patient.count(),
      prisma.treatment.count(),
      prisma.appointment.findMany({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        include: { patient: true },
        orderBy: [{ time: 'asc' }],
      }),
      prisma.session.findMany({
        include: { patient: true },
        orderBy: [{ date: 'desc' }],
        take: 5,
      }),
      prisma.$queryRaw`SELECT COALESCE(SUM(quantity * incomingPrice), 0) AS totalValue FROM MedicineStock`,
      prisma.$queryRaw`SELECT COALESCE(SUM(quantity * sellingPrice), 0) AS totalRevenue FROM MedicineStock`,
    ]);

    const todayAppointments = appointments.map((appointment) => ({
      id: appointment.id,
      patientName: appointment.patient?.name || 'Unknown',
      patientPhone: appointment.patient?.phone || '',
      status: appointment.status ?? 'PENDING',
      time: appointment.time instanceof Date
        ? appointment.time.toISOString().slice(11, 16)
        : appointment.time,
    }));

    const recentSessions = sessions.map((session) => ({
      id: session.id,
      patientName: session.patient?.name || 'Unknown',
      total: typeof session.total?.toNumber === 'function' ? session.total.toNumber() : Number(session.total ?? 0),
      date: session.date instanceof Date ? session.date.toISOString().split('T')[0] : session.date,
    }));

    const invRow = Array.isArray(inventoryValueRows) ? inventoryValueRows[0] : inventoryValueRows;
    const expRow = Array.isArray(expectedRevenueRows) ? expectedRevenueRows[0] : expectedRevenueRows;
    const inventoryValue = typeof invRow?.totalValue?.toNumber === 'function' ? invRow.totalValue.toNumber() : Number(invRow?.totalValue ?? 0);
    const expectedRevenue = typeof expRow?.totalRevenue?.toNumber === 'function' ? expRow.totalRevenue.toNumber() : Number(expRow?.totalRevenue ?? 0);

    return {
      counts: {
        patients,
        treatments,
        appointmentsToday: todayAppointments.length,
      },
      todayAppointments,
      recentSessions,
      inventoryValue,
      expectedRevenue,
      hasError: false,
    };
  } catch (error) {
    console.error('Unable to load dashboard data', error);
    return { ...fallback, hasError: true };
  }
}

export default async function DashboardPage() {
  const summary = await loadDashboardSummary();

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h1>
            <p className="mt-2 text-sm text-slate-600">Quick snapshot of the consulting center performance.</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/appointments"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-sky-400 transition hover:from-sky-600 hover:to-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 6.75a.75.75 0 01.75.75v3.75H16.5a.75.75 0 010 1.5h-3.75V16.5a.75.75 0 01-1.5 0v-3.75H7.5a.75.75 0 010-1.5h3.75V7.5a.75.75 0 01.75-.75z"/></svg>
              New Appointment
            </a>
            <a
              href="/sessions"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-emerald-400 transition hover:from-emerald-600 hover:to-teal-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M4.5 6.75A2.25 2.25 0 016.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v10.5A2.25 2.25 0 0117.25 19.5H6.75A2.25 2.25 0 014.5 17.25V6.75z"/><path d="M8.25 8.25h7.5v1.5h-7.5v-1.5zM8.25 12h7.5v1.5h-7.5V12z"/></svg>
              New Session
            </a>
          </div>
        </div>
        {summary.hasError ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Unable to connect to the database. Displaying placeholder values.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm ring-1 ring-inset ring-sky-100">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-100/60" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 ring-1 ring-inset ring-sky-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 14a5 5 0 100-10 5 5 0 000 10z"/><path fillRule="evenodd" d="M4.03 12.67a8.25 8.25 0 0115.94 0 .75.75 0 01-.41.86 12.32 12.32 0 01-7.56 1.47 12.32 12.32 0 01-7.56-1.47.75.75 0 01-.41-.86z" clipRule="evenodd"/></svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Patients</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.counts.patients}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm ring-1 ring-inset ring-violet-100">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-100/60" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-inset ring-violet-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 5.25A2.25 2.25 0 015.25 3h6A2.25 2.25 0 0113.5 5.25V6H18a3 3 0 013 3v1.5h-3.75A3.75 3.75 0 0013.5 14.25V21h-8.25A2.25 2.25 0 013 18.75v-13.5z"/><path d="M13.5 21v-6.75A2.25 2.25 0 0115.75 12h5.25V18A3 3 0 0118 21h-4.5z"/></svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Treatments</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.counts.treatments}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm ring-1 ring-inset ring-amber-100">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-100/60" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 6.75a.75.75 0 01.75.75v4.19l2.72 2.72a.75.75 0 11-1.06 1.06l-3-3A.75.75 0 0111.25 12V7.5A.75.75 0 0112 6.75z"/><path d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"/></svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Today&apos;s Appointments</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.counts.appointmentsToday}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm ring-1 ring-inset ring-emerald-100">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-100/60" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 ring-1 ring-inset ring-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v9A2.25 2.25 0 0118.75 18.75H5.25A2.25 2.25 0 013 16.5v-9z"/><path d="M7.5 9h9v6h-9z"/></svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Recent Sessions</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.recentSessions.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Removed stock summary cards per request */}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Appointments</h2>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
              {summary.todayAppointments.length} scheduled
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {summary.todayAppointments.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No appointments scheduled for today yet.
              </p>
            ) : (
              summary.todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{appointment.patientName}</p>
                    <p className="text-xs text-slate-500">{appointment.patientPhone || '--'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{appointment.time}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(appointment.status)}`}>
                      {formatStatusLabel(appointment.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Sessions</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Latest 5
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {summary.recentSessions.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No sessions recorded yet.
              </p>
            ) : (
              summary.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{session.patientName}</p>
                    <p className="text-xs text-slate-500">{session.date}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    LKR {session.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
