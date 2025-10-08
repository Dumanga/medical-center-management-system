export function normalizePhone(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function validatePatientPayload(payload) {
  const errors = [];

  const name = payload?.name?.trim() || '';
  const address = payload?.address?.trim() || null;
  const phone = normalizePhone(payload?.phone || '');
  const emailRaw = payload?.email?.trim() || '';
  const email = emailRaw.length > 0 ? emailRaw : null;

  if (!name) {
    errors.push('Name is required.');
  }

  if (!phone) {
    errors.push('Phone number is required.');
  }

  if (email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push('Email address is invalid.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: {
      name,
      address,
      phone,
      email,
    },
  };
}

