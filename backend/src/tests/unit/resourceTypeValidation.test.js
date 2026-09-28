const {
  createResourceTypeValidation,
  updateResourceTypeValidation,
  getResourceTypeByIdValidation,
  getResourceTypesQueryValidation,
  handleValidationErrors,
} = require('../../middlewares/resourceTypeValidation');
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
    name: 'Electricity',
    unit: 'kWh',
    is_active: true,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
describe('createResourceTypeValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validCreateBody() });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('пропускає дані без is_active (необов’язкове поле)', async () => {
    const body = validCreateBody();
    delete body.is_active;
    const req = makeReq({ body });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('name не може бути коротшим за 2 символи', async () => {
    const req = makeReq({ body: validCreateBody({ name: 'A' }) });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });

  it('name не може бути довшим за 255 символів', async () => {
    const req = makeReq({ body: validCreateBody({ name: 'a'.repeat(256) }) });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });

  it('пробіли по краях name не враховуються', async () => {
    const req = makeReq({ body: validCreateBody({ name: '  Gas  ' }) });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).not.toContain('name');
  });

  it('unit не може бути довшим за 50 символів', async () => {
    const req = makeReq({ body: validCreateBody({ unit: 'a'.repeat(51) }) });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).toContain('unit');
  });

  it('is_active має бути булевим', async () => {
    const req = makeReq({ body: validCreateBody({ is_active: 'yes' }) });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorFields(req)).toContain('is_active');
  });

  it.each([
    ['name', 'Name is required'],
    ['unit', 'Unit is required'],
  ])('без %s повертає одну помилку "обов’язкове поле"', async (field, expectedMessage) => {
    const body = validCreateBody();
    delete body[field];
    const req = makeReq({ body });

    await runValidations(createResourceTypeValidation, req);

    expect(getErrorMessages(req, field)).toEqual([expectedMessage]);
  });
});

// ─────────────────────────────────────────────
describe('updateResourceTypeValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateResourceTypeValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateResourceTypeValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

  it('перевіряє довжину name, якщо його передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { name: 'A' } });

    await runValidations(updateResourceTypeValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });

  it.each([
    ['name', 'Name cannot be empty'],
    ['unit', 'Unit cannot be empty'],
  ])('порожній %s повертає одну помилку', async (field, expectedMessage) => {
    const req = makeReq({ params: { id: '5' }, body: { [field]: '' } });

    await runValidations(updateResourceTypeValidation, req);

    expect(getErrorMessages(req, field)).toEqual([expectedMessage]);
  });
});

// ─────────────────────────────────────────────
describe('getResourceTypeByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getResourceTypeByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getResourceTypeByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getResourceTypesQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getResourceTypesQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний is_active', async () => {
    const req = makeReq({ query: { is_active: 'nope' } });

    await runValidations(getResourceTypesQueryValidation, req);

    expect(getErrorFields(req)).toContain('is_active');
  });

  it('відхиляє порожній фільтр name', async () => {
    const req = makeReq({ query: { name: '' } });

    await runValidations(getResourceTypesQueryValidation, req);

    expect(getErrorFields(req)).toContain('name');
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
    await runValidations(createResourceTypeValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validCreateBody({ name: 'A' }) });
    await runValidations(createResourceTypeValidation, req);

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