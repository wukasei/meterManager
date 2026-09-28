const {
  createResourceDeliveryValidation,
  updateResourceDeliveryValidation,
  getDeleteResourceDeliveryByIdValidation,
  getResourceDeliveriesQueryValidation,
  handleValidationErrors,
} = require('../../middlewares/resourceDeliveryValidation');
const { validationResult } = require('express-validator');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

function makeReq({ body = {}, params = {}, query = {} } = {}) {
  return { body, params, query };
}

async function runValidations(validations, req) {
  for (const validation of validations) {
    await validation.run(req);
  }
}

function getErrorFields(req) {
  return validationResult(req)
    .array()
    .map((e) => e.path || e.param);
}

function getErrorMessages(req, field) {
  return validationResult(req)
    .array()
    .filter((e) => (e.path || e.param) === field)
    .map((e) => e.msg);
}

function validCreateBody(overrides = {}) {
  return {
    location_id: 1,
    energy_resource_type_id: 2,
    delivery_date: '2025-03-15',
    quantity: '500.5',
    unit: 'kWh',
    price_per_unit: '4.32',
    total_cost: '2162.16',
    supplier: 'Lvivenergozbut',
    ...overrides,
  };
}

// ─────────────────────────────────────────────
describe('createResourceDeliveryValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validCreateBody() });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('пропускає дані без необов’язкових полів (price_per_unit, total_cost, supplier)', async () => {
    const body = validCreateBody();
    delete body.price_per_unit;
    delete body.total_cost;
    delete body.supplier;
    const req = makeReq({ body });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('location_id не може бути 0', async () => {
    const req = makeReq({ body: validCreateBody({ location_id: 0 }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });

  it('energy_resource_type_id має бути числом', async () => {
    const req = makeReq({ body: validCreateBody({ energy_resource_type_id: 'abc' }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('energy_resource_type_id');
  });

  it('delivery_date має бути коректною датою', async () => {
    const req = makeReq({ body: validCreateBody({ delivery_date: 'not-a-date' }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('delivery_date');
  });

  it('quantity не може бути від’ємною', async () => {
    const req = makeReq({ body: validCreateBody({ quantity: '-1' }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('quantity');
  });

  it('quantity може дорівнювати 0', async () => {
    const req = makeReq({ body: validCreateBody({ quantity: '0' }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).not.toContain('quantity');
  });

  it('unit обов’язковий', async () => {
    const body = validCreateBody();
    delete body.unit;
    const req = makeReq({ body });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('unit');
  });

  it('unit має бути рядком', async () => {
    const req = makeReq({ body: validCreateBody({ unit: 123 }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('unit');
  });

  it('price_per_unit не може бути від’ємною', async () => {
    const req = makeReq({ body: validCreateBody({ price_per_unit: '-5' }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('price_per_unit');
  });

  it('total_cost має бути числом', async () => {
    const req = makeReq({ body: validCreateBody({ total_cost: 'abc' }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('total_cost');
  });

  it('supplier має бути рядком', async () => {
    const req = makeReq({ body: validCreateBody({ supplier: 123 }) });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('supplier');
  });

    it.each([
    'location_id',   // перевіряється через validatePositiveInt
    'delivery_date', // перевіряється через validateDate
    'quantity',      // перевіряється через validateNonNegativeFloat
    'unit'
  ])('без %s повертає одну помилку "обов’язкове поле"', async (field) => {
    const body = validCreateBody();
    delete body[field];
    const req = makeReq({ body });

    await runValidations(createResourceDeliveryValidation, req);

    expect(getErrorMessages(req, field)).toEqual([`${field} is required`]);
  });
});

// ─────────────────────────────────────────────
describe('updateResourceDeliveryValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

  it('перевіряє quantity, якщо її передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { quantity: '-1' } });

    await runValidations(updateResourceDeliveryValidation, req);

    expect(getErrorFields(req)).toContain('quantity');
  });
});

// ─────────────────────────────────────────────
describe('getDeleteResourceDeliveryByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getDeleteResourceDeliveryByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getDeleteResourceDeliveryByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getResourceDeliveriesQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getResourceDeliveriesQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректну дату у фільтрі', async () => {
    const req = makeReq({ query: { delivery_date: 'not-a-date' } });

    await runValidations(getResourceDeliveriesQueryValidation, req);

    expect(getErrorFields(req)).toContain('delivery_date');
  });

  it('відхиляє нечисловий location_id у фільтрі', async () => {
    const req = makeReq({ query: { location_id: 'x' } });

    await runValidations(getResourceDeliveriesQueryValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });
});

// ─────────────────────────────────────────────
describe('handleValidationErrors', () => {
  let res;
  let next;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('викликає next, якщо помилок немає', async () => {
    const req = makeReq({ body: validCreateBody() });
    await runValidations(createResourceDeliveryValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validCreateBody({ quantity: '-1' }) });
    await runValidations(createResourceDeliveryValidation, req);

    handleValidationErrors(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: expect.any(Array),
    });
    expect(next).not.toHaveBeenCalled();
  });
});