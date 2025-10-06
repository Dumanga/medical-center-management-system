'use client';

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';

function mergeClasses(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Select({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}) {
  const resolvedValue = value ?? '';
  const selectedOption = options.find((option) => option.value === resolvedValue) ?? null;

  return (
    <Listbox value={resolvedValue} onChange={(next) => onChange?.(next)} disabled={disabled}>
      {({ open }) => (
        <div className={mergeClasses('relative', className)}>
          {typeof name === 'string' ? <input type="hidden" name={name} value={resolvedValue} /> : null}
          <Listbox.Button
            id={id}
            className={mergeClasses(
              'flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-0',
              disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : open
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-900 hover:border-sky-200',
            )}
          >
            <span className="truncate text-left">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className={mergeClasses('ml-3 flex-shrink-0 text-slate-400 transition', open ? 'text-sky-500' : '')}>
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            show={open}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Listbox.Options className="absolute z-30 mt-2 w-full max-h-60 overflow-auto rounded-xl border border-slate-100 bg-white py-1 shadow-xl focus:outline-none">
              {options.length === 0 ? (
                <div className="px-4 py-2 text-sm text-slate-400">No options available</div>
              ) : null}
              {options.map((option) => (
                <Listbox.Option
                  key={option.value ?? option.label}
                  value={option.value}
                  disabled={option.disabled}
                  className={({ active, selected, disabled: optionDisabled }) =>
                    mergeClasses(
                      'flex items-center justify-between px-4 py-2 text-sm',
                      optionDisabled ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer',
                      optionDisabled
                        ? ''
                        : active
                        ? 'bg-sky-50 text-slate-900'
                        : 'text-slate-600',
                      selected ? 'font-semibold text-sky-700' : '',
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="truncate">{option.label}</span>
                      {selected ? (
                        <span className="ml-2 text-sky-600">
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path d="M16 6l-8.5 8L4 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
