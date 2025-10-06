'use client';

import { Fragment, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';

function buildTimeOptions({ stepMinutes, startHour, endHour }) {
  const options = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      if (hour === endHour && minute > 0) {
        break;
      }
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      options.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return options;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  stepMinutes = 30,
  startHour = 8,
  endHour = 20,
}) {
  const options = useMemo(() => buildTimeOptions({ stepMinutes, startHour, endHour }), [stepMinutes, startHour, endHour]);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Listbox value={value ?? ''} onChange={(next) => onChange?.(next)}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-0 ${
              open
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-900 hover:border-sky-200'
            }`}
          >
            <span>{selected ? selected.label : placeholder}</span>
            <span className={`ml-3 text-xs transition ${open ? 'text-sky-500' : 'text-slate-400'}`} aria-hidden="true">
              ▼
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Listbox.Options className="absolute z-30 mt-2 w-full max-h-60 overflow-auto rounded-xl border border-slate-100 bg-white shadow-xl">
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
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
                  {option.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
