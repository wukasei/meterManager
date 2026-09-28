const {
  createTenantValidation,
  updateTenantValidation,
  getTenantByIdValidation,
  getTenantsQueryValidation,
  handleValidationErrors,
} = require('../../middlewares/tenantValidation');
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
    name: 'Tenant LLC',
    location_ids: [1, 2],
    occupied_area: '120.5',
    contact_person: 'Ivan Petrenko',
    phone: '+380501234567',
    email: 'tenant@example.com',
    is_active: true,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
describe('createTenantValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validCreateBody() });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('пропускає, якщо передано тільки name (решта полів необов’язкові)', async () => {
    const req = makeReq({ body: { name: 'Tenant LLC' } });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('name не може бути коротшим за 2 символи', async () => {
    const req = makeReq({ body: validCreateBody({ name: 'A' }) });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });

  describe('location_ids', () => {
    it('має бути масивом', async () => {
      const req = makeReq({ body: validCreateBody({ location_ids: '1' }) });

      await runValidations(createTenantValidation, req);

      expect(getErrorMessages(req, 'location_ids')).toEqual(['location_ids must be an array']);
    });

    it('може бути порожнім масивом', async () => {
      const req = makeReq({ body: validCreateBody({ location_ids: [] }) });

      await runValidations(createTenantValidation, req);

      expect(getErrorFields(req)).not.toContain('location_ids');
    });

    it('відхиляє масив, де є 0', async () => {
      const req = makeReq({ body: validCreateBody({ location_ids: [1, 0] }) });

      await runValidations(createTenantValidation, req);

      expect(getErrorFields(req)).toContain('location_ids');
    });

    it('відхиляє масив з числами-рядками', async () => {
      const req = makeReq({ body: validCreateBody({ location_ids: ['1', '2'] }) });

      await runValidations(createTenantValidation, req);

      expect(getErrorFields(req)).toContain('location_ids');
    });
  });

  it('occupied_area не може бути від’ємною', async () => {
    const req = makeReq({ body: validCreateBody({ occupied_area: '-1' }) });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toContain('occupied_area');
  });

  it('contact_person не може бути довшим за 255 символів', async () => {
    const req = makeReq({ body: validCreateBody({ contact_person: 'a'.repeat(256) }) });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toContain('contact_person');
  });

  it('phone не може бути довшим за 50 символів', async () => {
    const req = makeReq({ body: validCreateBody({ phone: '1'.repeat(51) }) });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toContain('phone');
  });

  it('email має бути коректним', async () => {
    const req = makeReq({ body: validCreateBody({ email: 'not-an-email' }) });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toContain('email');
  });

  it('is_active має бути булевим', async () => {
    const req = makeReq({ body: validCreateBody({ is_active: 'yes' }) });

    await runValidations(createTenantValidation, req);

    expect(getErrorFields(req)).toContain('is_active');
  });

    it('без name повертає одну помилку "обов’язкове поле"', async () => {
    const body = validCreateBody();
    delete body.name;
    const req = makeReq({ body });

    await runValidations(createTenantValidation, req);

    expect(getErrorMessages(req, 'name')).toEqual(['Name is required']);
  });
});

// ─────────────────────────────────────────────
describe('updateTenantValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateTenantValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

    it('порожній name повертає одну помилку', async () => {
    const req = makeReq({ params: { id: '5' }, body: { name: '' } });

    await runValidations(updateTenantValidation, req);

    expect(getErrorMessages(req, 'name')).toEqual(['Name cannot be empty']);
  });
});

// ─────────────────────────────────────────────
describe('getTenantByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getTenantByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getTenantByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getTenantsQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getTenantsQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє нечисловий location_id у фільтрі', async () => {
    const req = makeReq({ query: { location_id: 'x' } });

    await runValidations(getTenantsQueryValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });

  it('відхиляє порожній фільтр name', async () => {
    const req = makeReq({ query: { name: '' } });

    await runValidations(getTenantsQueryValidation, req);

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
    await runValidations(createTenantValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validCreateBody({ name: 'A' }) });
    await runValidations(createTenantValidation, req);

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