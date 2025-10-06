export function normalizeStockCode(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toUpperCase();
}

function parsePositiveInteger(value) {
  const numeric = typeof value === 'number' ? value : Number.parseInt(`${value}`.trim(), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function parseCurrency(value) {
  if (value === undefined || value === null || `${value}`.trim() === '') {
    return { error: 'Price is required.', amount: null };
  }

  const normalized = typeof value === 'number' ? value : Number.parseFloat(`${value}`.replace(/,/g, '').trim());
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return { error: 'Price must be a positive number.', amount: null };
  }

  if (Math.round(normalized * 100) !== normalized * 100) {
    return { error: 'Price can only have up to two decimal places.', amount: null };
  }

  return { error: null, amount: normalized };
}

export function validateMedicineTypePayload(payload) {
  const errors = [];
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';

  if (!name) {
    errors.push('Medicine type name is required.');
  } else if (name.length > 100) {
    errors.push('Medicine type name must be 100 characters or less.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: { name },
  };
}

export function validateStockPayload(payload) {
  const errors = [];

  const code = normalizeStockCode(payload?.code ?? '');
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const quantity = parsePositiveInteger(payload?.quantity);
  const medicineTypeId = parsePositiveInteger(payload?.medicineTypeId);

  const incomingPriceResult = parseCurrency(payload?.incomingPrice);
  const sellingPriceResult = parseCurrency(payload?.sellingPrice);

  if (!medicineTypeId) {
    errors.push('Medicine type is required.');
  }

  if (!code) {
    errors.push('Medicine code is required.');
  }

  if (!name) {
    errors.push('Medicine name is required.');
  }

  if (!quantity) {
    errors.push('Quantity must be a positive whole number.');
  }

  if (incomingPriceResult.error) {
    errors.push(incomingPriceResult.error);
  }

  if (sellingPriceResult.error) {
    errors.push(sellingPriceResult.error);
  }

  if (!incomingPriceResult.error && !sellingPriceResult.error) {
    if (incomingPriceResult.amount > sellingPriceResult.amount) {
      errors.push('Selling price should be greater than or equal to incoming price.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: {
      medicineTypeId,
      code,
      name,
      quantity,
      incomingPrice: incomingPriceResult.amount,
      sellingPrice: sellingPriceResult.amount,
    },
  };
}
