function parsePositiveInt(value) {
  const numeric = typeof value === 'number' ? value : Number.parseInt(`${value ?? ''}`.trim(), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function parseNonNegativeNumber(value, options = {}) {
  const { allowNull = false } = options;
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return allowNull ? { amount: null, error: null } : { amount: null, error: 'Value is required.' };
  }

  const numeric = typeof value === 'number' ? value : Number.parseFloat(`${value}`.replace(/,/g, '').trim());
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { amount: null, error: 'Value must be zero or a positive number.' };
  }

  if (Math.round(numeric * 100) !== numeric * 100) {
    return { amount: null, error: 'Value can only have up to two decimal places.' };
  }

  return { amount: numeric, error: null };
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function validateSessionPayload(payload) {
  const errors = [];

  const patientId = parsePositiveInt(payload?.patientId);
  if (!patientId) {
    errors.push('Patient is required.');
  }

  const dateValue = parseDate(payload?.date ?? new Date().toISOString());
  if (!dateValue) {
    errors.push('A valid session date is required.');
  }

  const description = typeof payload?.description === 'string' ? payload.description.trim() : '';

  const treatmentInput = Array.isArray(payload?.items) ? payload.items : [];
  const medicineInput = Array.isArray(payload?.medicines) ? payload.medicines : [];

  if (treatmentInput.length === 0 && medicineInput.length === 0) {
    errors.push('Add at least one treatment or medicine to the session.');
  }

  const normalizedTreatments = [];
  let treatmentsTotal = 0;

  treatmentInput.forEach((item, index) => {
    const treatmentId = parsePositiveInt(item?.treatmentId);
    if (!treatmentId) {
      errors.push(`Treatment selection is required for item ${index + 1}.`);
    }

    const quantityRaw = item?.quantity ?? 1;
    const quantity = parsePositiveInt(quantityRaw) ?? 1;

    const unitPriceResult = parseNonNegativeNumber(item?.unitPrice);
    if (unitPriceResult.error) {
      errors.push(`Unit price is invalid for treatment item ${index + 1}.`);
    }

    const discountResult = parseNonNegativeNumber(item?.discount ?? 0, { allowNull: true });
    if (discountResult.error) {
      errors.push(`Discount is invalid for treatment item ${index + 1}.`);
    }

    const unitPrice = unitPriceResult.amount ?? 0;
    const lineDiscount = discountResult.amount ?? 0;
    const lineSubtotal = quantity * unitPrice;

    if (lineDiscount > lineSubtotal) {
      errors.push(`Discount cannot exceed subtotal for treatment item ${index + 1}.`);
    }

    const lineTotal = Math.max(0, lineSubtotal - lineDiscount);
    treatmentsTotal += lineTotal;

    normalizedTreatments.push({
      treatmentId,
      quantity,
      unitPrice,
      discount: lineDiscount,
      total: lineTotal,
    });
  });

  const normalizedMedicines = [];
  let medicinesTotal = 0;

  medicineInput.forEach((item, index) => {
    const medicineId = parsePositiveInt(item?.medicineId);
    if (!medicineId) {
      errors.push(`Medicine selection is required for medicine item ${index + 1}.`);
    }

    const quantityRaw = item?.quantity ?? 1;
    const quantity = parsePositiveInt(quantityRaw) ?? 1;

    const unitPriceResult = parseNonNegativeNumber(item?.unitPrice);
    if (unitPriceResult.error) {
      errors.push(`Unit price is invalid for medicine item ${index + 1}.`);
    }

    const discountResult = parseNonNegativeNumber(item?.discount ?? 0, { allowNull: true });
    if (discountResult.error) {
      errors.push(`Discount is invalid for medicine item ${index + 1}.`);
    }

    const unitPrice = unitPriceResult.amount ?? 0;
    const lineDiscount = discountResult.amount ?? 0;
    const lineSubtotal = quantity * unitPrice;

    if (lineDiscount > lineSubtotal) {
      errors.push(`Discount cannot exceed subtotal for medicine item ${index + 1}.`);
    }

    const lineTotal = Math.max(0, lineSubtotal - lineDiscount);
    medicinesTotal += lineTotal;

    normalizedMedicines.push({
      medicineId,
      quantity,
      unitPrice,
      discount: lineDiscount,
      total: lineTotal,
    });
  });

  const sessionDiscountResult = parseNonNegativeNumber(payload?.discount ?? 0, { allowNull: true });
  if (sessionDiscountResult.error) {
    errors.push(sessionDiscountResult.error);
  }

  const sessionDiscount = sessionDiscountResult.amount ?? 0;
  const subtotal = treatmentsTotal + medicinesTotal;
  if (sessionDiscount > subtotal) {
    errors.push('Session discount cannot exceed item total.');
  }

  const total = Math.max(0, subtotal - sessionDiscount);

  return {
    isValid: errors.length === 0,
    errors,
    values: {
      patientId,
      date: dateValue ? dateValue.toISOString() : null,
      description,
      discount: sessionDiscount,
      total,
      items: normalizedTreatments,
      medicines: normalizedMedicines,
    },
  };
}
