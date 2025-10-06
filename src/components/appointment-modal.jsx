'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import DatePicker from '@/components/ui/date-picker';
import TimePicker from '@/components/ui/time-picker';
import PatientModal from './patient-modal';

const INITIAL_FORM = {
  patientId: '',
  date: '',
  time: '',
  notes: '',
};

const DEFAULT_TIME = '09:00';

function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePatientOption(patient) {
  if (!patient) {
    return null;
  }

  return {
    id: patient.id,
    name: patient.name,
    phone: patient.phone,
  };
}

export default function AppointmentModal({ isOpen, onClose, onSuccess, initialAppointment }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setLoadingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [isPatientModalOpen, setPatientModalOpen] = useState(false);

  const isEditing = useMemo(() => Boolean(initialAppointment?.id), [initialAppointment?.id]);
  const selectedPatient = useMemo(() => {
    if (!form.patientId) {
      return null;
    }
    return patients.find((patient) => String(patient.id) === String(form.patientId)) ?? null;
  }, [form.patientId, patients]);

  const fetchPatients = useCallback(async () => {
    setLoadingPatients(true);
    setPatientsError('');

    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '100');

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
      const options = Array.isArray(payload.data)
        ? payload.data.map((patient) => normalizePatientOption(patient)).filter(Boolean)
        : [];

      options.sort((a, b) => a.name.localeCompare(b.name));
      setPatients(options);
      return options;
    } catch (error) {
      setPatientsError(error.message ?? 'Unable to load patients.');
      return [];
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setErrors([]);
      setPatientsError('');
      setPatientModalOpen(false);
      return;
    }

    const defaultDate = initialAppointment?.date ?? getTodayIsoDate();
    const defaultTime = initialAppointment?.time ?? DEFAULT_TIME;

    setForm({
      patientId: initialAppointment?.patientId ? String(initialAppointment.patientId) : '',
      date: defaultDate,
      time: defaultTime,
      notes: initialAppointment?.notes ?? '',
    });
    setErrors([]);

    let isActive = true;

    (async () => {
      const loadedPatients = await fetchPatients();
      if (!isActive) {
        return;
      }

      const currentPatient = normalizePatientOption(initialAppointment?.patient);
      if (currentPatient && !loadedPatients.some((option) => option.id === currentPatient.id)) {
        setPatients((previous) => {
          const next = [...previous, currentPatient];
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [fetchPatients, initialAppointment, isOpen]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitting(true);
      setErrors([]);

      try {
        const endpoint = isEditing ? `/api/appointments/${initialAppointment.id}` : '/api/appointments';
        const method = isEditing ? 'PATCH' : 'POST';

        const payload = {
          patientId: form.patientId ? Number.parseInt(form.patientId, 10) : null,
          date: form.date,
          time: form.time,
          notes: form.notes,
        };

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          const messages = result.errors ?? (result.message ? [result.message] : ['Unable to save appointment.']);
          setErrors(messages);
          return;
        }

        setForm(INITIAL_FORM);
        onSuccess?.({
          appointment: result.data,
          mode: isEditing ? 'update' : 'create',
        });
      } catch (error) {
        setErrors(['Unexpected error while saving appointment.']);
      } finally {
        setSubmitting(false);
      }
    },
    [form.date, form.notes, form.patientId, form.time, initialAppointment, isEditing, onSuccess],
  );

  const handlePatientModalClose = useCallback(() => {
    setPatientModalOpen(false);
  }, []);

  const handlePatientModalSuccess = useCallback(({ patient }) => {
    if (!patient) {
      setPatientModalOpen(false);
      return;
    }

    const normalized = normalizePatientOption(patient);
    setPatients((previous) => {
      const exists = previous.some((option) => option.id === normalized.id);
      const next = exists
        ? previous.map((option) => (option.id === normalized.id ? normalized : option))
        : [...previous, normalized];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setForm((previous) => ({ ...previous, patientId: String(normalized.id) }));
    setPatientModalOpen(false);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 py-8 backdrop-blur">
        <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Update Appointment' : 'Create Appointment'}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isEditing
                  ? 'Adjust scheduling details and keep the patient in sync.'
                  : 'Assign a patient, pick a date and time, and capture optional visit notes.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="appointment-patient" className="block text-sm font-medium text-slate-700">
                Patient <span className="text-rose-500">*</span>
              </label>
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <Listbox
                    value={form.patientId}
                    onChange={(value) =>
                      setForm((previous) => ({
                        ...previous,
                        patientId: value,
                      }))
                    }
                    disabled={isLoadingPatients}
                  >
                    {({ open, disabled }) => (
                      <>
                        <Listbox.Button
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-0 ${
                            disabled
                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-sky-200 focus:border-sky-500'
                          }`}
                        >
                          <span className="block truncate">
                            {selectedPatient
                              ? selectedPatient.phone
                                ? `${selectedPatient.name} (${selectedPatient.phone})`
                                : selectedPatient.name
                              : isLoadingPatients
                              ? 'Loading patients...'
                              : 'Select a patient'}
                          </span>
                          <span className={`ml-3 text-xs transition ${open ? 'text-sky-500' : 'text-slate-400'}`} aria-hidden="true">
                            v
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-20 mt-2 w-full max-h-60 overflow-auto rounded-xl border border-slate-100 bg-white shadow-xl">
                            {patients.length === 0 ? (
                              <li className="px-4 py-2 text-sm text-slate-500">
                                {isLoadingPatients ? 'Loading patients...' : 'No patients available'}
                              </li>
                            ) : (
                              patients.map((patient) => (
                                <Listbox.Option
                                  key={patient.id}
                                  value={String(patient.id)}
                                  className={({ active, selected }) =>
                                    `cursor-pointer px-4 py-2 text-sm ${
                                      selected
                                        ? 'bg-sky-50 font-semibold text-sky-700'
                                        : active
                                        ? 'bg-sky-100 text-slate-900'
                                        : 'text-slate-600'
                                    }`
                                  }
                                >
                                  <div className="flex flex-col">
                                    <span>{patient.name}</span>
                                    {patient.phone ? (
                                      <span className="text-xs text-slate-400">{patient.phone}</span>
                                    ) : null}
                                  </div>
                                </Listbox.Option>
                              ))
                            )}
                          </Listbox.Options>
                        </Transition>
                      </>
                    )}
                  </Listbox>
                </div>
                <button
                  type="button"
                  onClick={() => setPatientModalOpen(true)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                >
                  + New Patient
                </button>
              </div>
              {patientsError ? (
                <p className="mt-2 text-xs text-rose-500">{patientsError}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2">
                  <DatePicker
                    value={form.date}
                    onChange={(next) => setForm((previous) => ({ ...previous, date: next }))}
                    min={getTodayIsoDate()}
                    allowClear
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Time <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2">
                  <TimePicker
                    value={form.time}
                    onChange={(next) => setForm((previous) => ({ ...previous, time: next }))}
                    placeholder="Select time"
                    startHour={8}
                    endHour={20}
                    stepMinutes={5}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="appointment-notes" className="block text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                id="appointment-notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional"
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            {errors.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {errors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Appointment' : 'Create Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={handlePatientModalClose}
        onSuccess={handlePatientModalSuccess}
        initialPatient={null}
      />
    </>
  );
}



