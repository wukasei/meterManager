const {
  createTariffValidation,
  updateTariffValidation,
  getTariffByIdValidation,
  getTariffsQueryValidation,
  handleValidationErrors,
} = require('../../middlewares/tariffValidation');
const { validationResult } = require('express-validator');

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
    price: '4.3215',
    valid_from: '2025-01-01',
    valid_to: '2025-12-31',
    ...overrides,
  };
}

// ─────────────────────────────────────────────
describe('createTariffValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validCreateBody() });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('valid_to необов’язкова (тариф без дати завершення)', async () => {
    const body = validCreateBody();
    delete body.valid_to;
    const req = makeReq({ body });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('valid_to може бути null', async () => {
    const req = makeReq({ body: validCreateBody({ valid_to: null }) });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('location_id обов’язковий', async () => {
    const body = validCreateBody();
    delete body.location_id;
    const req = makeReq({ body });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });

  it('price не може бути від’ємною', async () => {
    const req = makeReq({ body: validCreateBody({ price: '-1' }) });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toContain('price');
  });

  it('price має бути числом', async () => {
    const req = makeReq({ body: validCreateBody({ price: 'abc' }) });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toContain('price');
  });

  it('valid_from має бути у форматі YYYY-MM-DD', async () => {
    const req = makeReq({ body: validCreateBody({ valid_from: '01.01.2025' }) });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toContain('valid_from');
  });

  it('відхиляє valid_to, що раніше за valid_from', async () => {
    const req = makeReq({
      body: validCreateBody({ valid_from: '2025-06-01', valid_to: '2025-01-01' }),
    });

    await runValidations(createTariffValidation, req);

    expect(getErrorMessages(req, 'valid_to')).toContain(
      'valid_to date must be after valid_from date.'
    );
  });

  it('відхиляє valid_to, що дорівнює valid_from', async () => {
    const req = makeReq({
      body: validCreateBody({ valid_from: '2025-06-01', valid_to: '2025-06-01' }),
    });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toContain('valid_to');
  });

    it('відхиляє price з 5 знаками після коми', async () => {
    const req = makeReq({ body: validCreateBody({ price: '4.12345' }) });

    await runValidations(createTariffValidation, req);

    expect(getErrorFields(req)).toContain('price');
  });

    it.each([
    ['price', 'Price is required'],
    ['valid_from', 'valid_from is required'],
  ])('без %s повертає одну помилку "обов’язкове поле"', async (field, expectedMessage) => {
    const body = validCreateBody();
    delete body[field];
    const req = makeReq({ body });

    await runValidations(createTariffValidation, req);

    expect(getErrorMessages(req, field)).toEqual([expectedMessage]);
  });
});

// ─────────────────────────────────────────────
describe('updateTariffValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateTariffValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateTariffValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

  it('перевіряє price, якщо її передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { price: '-1' } });

    await runValidations(updateTariffValidation, req);

    expect(getErrorFields(req)).toContain('price');
  });

    it('відхиляє price з 5 знаками після коми', async () => {
    const req = makeReq({ params: { id: '5' }, body: { price: '4.12345' } });

    await runValidations(updateTariffValidation, req);

    expect(getErrorFields(req)).toContain('price');
  });

  // Характеризаційний тест: якщо передати тільки valid_to, його ні з чим не порівнюють,
  // бо valid_from лежить у базі даних (треба перевірити в services)
  it('[поточна поведінка] пропускає тільки valid_to без порівняння з датою початку', async () => {
    const req = makeReq({ params: { id: '5' }, body: { valid_to: '1990-01-01' } });

    await runValidations(updateTariffValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });
});

// ─────────────────────────────────────────────
describe('getTariffByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getTariffByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getTariffByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getTariffsQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getTariffsQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректну дату у фільтрі', async () => {
    const req = makeReq({ query: { valid_from: 'not-a-date' } });

    await runValidations(getTariffsQueryValidation, req);

    expect(getErrorFields(req)).toContain('valid_from');
  });

  it('відхиляє нечисловий location_id у фільтрі', async () => {
    const req = makeReq({ query: { location_id: 'x' } });

    await runValidations(getTariffsQueryValidation, req);

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
    await runValidations(createTariffValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validCreateBody({ price: '-1' }) });
    await runValidations(createTariffValidation, req);

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