'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

export default function PatientModal({ isOpen, onClose, onSuccess, initialPatient }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);

  const [countries, setCountries] = useState([
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  ]);
  const [selectedCountry, setSelectedCountry] = useState({ code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' }); // Default LK

  // Load full country list (dial codes) from Rest Countries API
  useEffect(() => {
    let cancelled = false;
    async function loadCountries() {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag');
        if (!res.ok) throw new Error('Failed to load countries');
        const data = await res.json();
        const mapped = data
          .map((c) => {
            const code = c.cca2 || '';
            const name = c?.name?.common || code || 'Unknown';
            const root = c?.idd?.root || '';
            const suffixes = Array.isArray(c?.idd?.suffixes) ? c.idd.suffixes : [];
            const dial = root && suffixes.length > 0 ? `${root}${suffixes[0]}` : root || '';
            const flag = c?.flag || '';
            if (!dial) return null;
            return { code, name, dialCode: dial, flag };
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled && mapped.length > 0) {
          setCountries(mapped);
          // Keep selection if it exists in new list, else LK -> first match
          const nextSel = mapped.find((m) => m.code === 'LK') || mapped[0];
          setSelectedCountry((prev) => {
            if (!prev) return nextSel;
            const match = mapped.find((m) => m.code === prev.code) || mapped.find((m) => m.dialCode === prev.dialCode);
            return match || nextSel;
          });
        }
      } catch (e) {
        // Fallback stays with minimal list; no hard failure
      }
    }
    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEditing = useMemo(() => Boolean(initialPatient?.id), [initialPatient?.id]);

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setErrors([]);
      setSubmitting(false);
      setSelectedCountry(countries[0]);
      return;
    }

    if (initialPatient) {
      const fullPhone = initialPatient.phone ?? '';
      // Try to infer country from stored phone starting with +code
      let picked = countries.find((c) => c.code === 'LK') || countries[0];
      let local = fullPhone;
      if (typeof fullPhone === 'string' && fullPhone.startsWith('+')) {
        // Choose the longest matching dial code
        const match = countries
          .slice()
          .sort((a, b) => b.dialCode.length - a.dialCode.length)
          .find((c) => fullPhone.startsWith(c.dialCode));
        if (match) {
          picked = match;
          local = fullPhone.slice(match.dialCode.length);
        }
      }
      setSelectedCountry(picked);
      setForm({
        name: initialPatient.name ?? '',
        phone: local ?? '',
        email: initialPatient.email ?? '',
        address: initialPatient.address ?? '',
      });
    } else {
      setForm(INITIAL_FORM);
      setSelectedCountry(countries.find((c) => c.code === 'LK') || countries[0]);
    }
    setErrors([]);
  }, [initialPatient, isOpen, countries]);

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
        const endpoint = isEditing ? `/api/patients/${initialPatient.id}` : '/api/patients';
        const method = isEditing ? 'PATCH' : 'POST';

        // Compose full phone with selected country code
        const localRaw = (form.phone || '').trim();
        let phoneToSave = localRaw;
        if (localRaw.startsWith('+')) {
          phoneToSave = localRaw;
        } else {
          const digits = localRaw.replace(/\s+/g, '').replace(/^0+/, '');
          phoneToSave = `${selectedCountry.dialCode}${digits}`;
        }

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: phoneToSave,
            email: form.email,
            address: form.address,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const messages = payload.errors ?? (payload.message ? [payload.message] : ['Unable to save patient.']);
          setErrors(messages);
          return;
        }

        setForm(INITIAL_FORM);
        setSelectedCountry(countries[0]);
        onSuccess?.({
          patient: payload.data,
          mode: isEditing ? 'update' : 'create',
        });
      } catch (error) {
        setErrors(['Unexpected error while saving patient.']);
      } finally {
        setSubmitting(false);
      }
    },
    [form.address, form.email, form.name, form.phone, initialPatient, isEditing, onSuccess],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Update Patient' : 'Add New Patient'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isEditing
                ? 'Modify patient contact details and save your changes.'
                : 'Capture patient contact information to streamline future appointments.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="patient-name" className="block text-sm font-medium text-slate-700">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="patient-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="e.g. John Perera"
            />
          </div>

          <div>
            <label htmlFor="patient-phone" className="block text-sm font-medium text-slate-700">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Listbox value={selectedCountry} onChange={setSelectedCountry}>
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-left text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200">
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="font-medium">{selectedCountry.dialCode}</span>
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">▾</span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
                        {countries.map((country) => (
                          <Listbox.Option
                            key={country.code}
                            className={({ active }) => `relative cursor-pointer select-none px-3 py-2 ${active ? 'bg-sky-50 text-sky-700' : 'text-slate-700'}`}
                            value={country}
                          >
                            {({ selected }) => (
                              <span className={`flex items-center gap-2 truncate ${selected ? 'font-semibold text-slate-900' : ''}`}>
                                <span className="text-base">{country.flag}</span>
                                <span>{country.name}</span>
                                <span className="ml-auto font-mono text-xs text-slate-500">{country.dialCode}</span>
                              </span>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>
              <div className="col-span-2">
                <input
                  id="patient-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="e.g. 771234567"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">Stored as {selectedCountry.dialCode}{(form.phone || '').replace(/^0+/, '').replace(/\s+/g, '')}</p>
          </div>

          <div>
            <label htmlFor="patient-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="patient-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="patient-address" className="block text-sm font-medium text-slate-700">
              Address
            </label>
            <textarea
              id="patient-address"
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Optional"
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Patient' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

