'use client';

import { Fragment, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

function parseDate(value) {
  if (!value) {
    return null;
  }
  try {
    return parseISO(value);
  } catch (error) {
    return null;
  }
}

function toValue(date) {
  return format(date, 'yyyy-MM-dd');
}

function buildDayLabels(weekStartsOn) {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (weekStartsOn === 0) {
    return base;
  }
  return base.slice(weekStartsOn).concat(base.slice(0, weekStartsOn));
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  weekStartsOn = 1,
  placeholder = 'Select date',
  allowClear = false,
}) {
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const minDate = useMemo(() => parseDate(min), [min]);
  const maxDate = useMemo(() => parseDate(max), [max]);
  const initialMonth = selectedDate ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(initialMonth));

  const dayLabels = useMemo(() => buildDayLabels(weekStartsOn), [weekStartsOn]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn });

    const days = eachDayOfInterval({ start, end });
    const grouped = [];

    days.forEach((day, index) => {
      const weekIndex = Math.floor(index / 7);
      if (!grouped[weekIndex]) {
        grouped[weekIndex] = [];
      }
      grouped[weekIndex].push(day);
    });

    return grouped;
  }, [visibleMonth, weekStartsOn]);

  const isDisabled = (day) => {
    if (minDate && isBefore(day, minDate)) {
      return true;
    }
    if (maxDate && isAfter(day, maxDate)) {
      return true;
    }
    return false;
  };

  const handleSelect = (day, close) => {
    if (isDisabled(day)) {
      return;
    }
    onChange?.(toValue(day));
    close();
  };

  const buttonLabel = selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder;

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-0 ${
              open
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-900 hover:border-sky-200'
            }`}
          >
            <span className="truncate">{buttonLabel}</span>
            <span className={`ml-3 text-xs transition ${open ? 'text-sky-500' : 'text-slate-400'}`} aria-hidden="true">
              ▼
            </span>
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
              {({ close: closePanel }) => (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                    >
                      Prev
                    </button>
                    <p className="text-sm font-semibold text-slate-900">{format(visibleMonth, 'MMMM yyyy')}</p>
                    <button
                      type="button"
                      onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                    >
                      Next
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {dayLabels.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 px-3 pb-4">
                    {weeks.flat().map((day) => {
                      const disabled = isDisabled(day);
                      const isCurrentMonth = isWithinInterval(day, {
                        start: startOfMonth(visibleMonth),
                        end: endOfMonth(visibleMonth),
                      });
                      const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => handleSelect(day, closePanel)}
                          disabled={disabled}
                          className={`aspect-square rounded-lg text-sm transition ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow'
                              : disabled
                              ? 'cursor-not-allowed text-slate-300'
                              : isCurrentMonth
                              ? 'text-slate-700 hover:bg-sky-50'
                              : 'text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                  {allowClear ? (
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          onChange?.('');
                          closePanel();
                        }}
                        className="text-xs font-semibold text-slate-500 transition hover:text-rose-500"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => closePanel()}
                        className="text-xs font-semibold text-slate-500 transition hover:text-sky-600"
                      >
                        Close
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
