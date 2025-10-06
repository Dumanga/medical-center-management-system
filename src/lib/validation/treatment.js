export function normalizeTreatmentCode(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toUpperCase();
}

export function validateTreatmentPayload(payload) {
  const errors = [];

  const code = normalizeTreatmentCode(payload?.code ?? '');
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const priceInput = payload?.price;

  let priceValue = null;

  if (!code) {
    errors.push('Treatment code is required.');
  }

  if (!name) {
    errors.push('Treatment name is required.');
  }

  if (priceInput === undefined || priceInput === null || `${priceInput}`.trim() === '') {
    errors.push('Price is required.');
  } else {
    const normalized = typeof priceInput === 'number' ? priceInput : Number.parseFloat(`${priceInput}`.replace(/,/g, '').trim());
    if (!Number.isFinite(normalized) || normalized <= 0) {
      errors.push('Price must be a positive number.');
    } else if (Math.round(normalized * 100) !== normalized * 100) {
      errors.push('Price can only have up to two decimal places.');
    } else {
      priceValue = normalized;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: {
      code,
      name,
      price: priceValue,
    },
  };
}

