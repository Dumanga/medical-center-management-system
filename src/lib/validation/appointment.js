export function parseDateOnly(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { date, iso: `${match[1]}-${match[2]}-${match[3]}` };
}

export function parseTime(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const time = new Date(Date.UTC(1970, 0, 1, hours, minutes));

  return { date: time, iso: `${match[1]}:${match[2]}` };
}

function getTodayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function validateAppointmentPayload(payload) {
  const errors = [];

  const patientIdRaw = payload?.patientId;
  const patientId = Number.parseInt(patientIdRaw, 10);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    errors.push('Valid patient selection is required.');
  }

  const dateResult = parseDateOnly(payload?.date ?? '');
  if (!dateResult) {
    errors.push('Date must be provided in YYYY-MM-DD format.');
  }

  const timeResult = parseTime(payload?.time ?? '');
  if (!timeResult) {
    errors.push('Time must follow HH:MM (24h) format.');
  }

  if (dateResult) {
    const today = getTodayUtcDate();
    if (dateResult.date < today) {
      errors.push('Appointment date cannot be in the past.');
    }
  }

  let notes = null;
  if (typeof payload?.notes === 'string') {
    const trimmed = payload.notes.trim();
    notes = trimmed.length > 0 ? trimmed : null;
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: {
      patientId,
      date: dateResult?.date ?? null,
      time: timeResult?.date ?? null,
      notes,
    },
    meta: {
      dateIso: dateResult?.iso ?? null,
      timeIso: timeResult?.iso ?? null,
    },
  };
}

export function formatAppointmentDate(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export function formatAppointmentTime(time) {
  if (!(time instanceof Date)) {
    return '';
  }
  return time.toISOString().slice(11, 16);
}