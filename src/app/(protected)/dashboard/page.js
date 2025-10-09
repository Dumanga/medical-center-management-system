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
    hasError: false,
  };

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [patients, treatments, appointments, sessions] = await Promise.all([
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

    return {
      counts: {
        patients,
        treatments,
        appointmentsToday: todayAppointments.length,
      },
      todayAppointments,
      recentSessions,
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
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-slate-600">
          Quick snapshot of the consulting center performance.
        </p>
        {summary.hasError ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Unable to connect to the database. Displaying placeholder values.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Patients</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.counts.patients}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Treatments</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.counts.treatments}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Today&apos;s Appointments</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.counts.appointmentsToday}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Recent Sessions</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.recentSessions.length}</p>
        </div>
      </section>

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
