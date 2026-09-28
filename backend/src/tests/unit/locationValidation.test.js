const {
  createLocationValidation,
  updateLocationValidation,
  getLocationByIdValidation,
  getLocationsQueryValidation,
  assignTenantValidation,
  unassignTenantValidation,
  handleValidationErrors,
} = require('../../middlewares/locationValidation');
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

// Повертає текст помилки для конкретного поля
function getErrorMessage(req, field) {
  const error = validationResult(req)
    .array()
    .find((e) => (e.path || e.param) === field);
  return error ? error.msg : undefined;
}

function validCreateBody(overrides = {}) {
  return {
    name: 'Office A',
    address: 'Lviv, Main st. 1',
    tenant_id: 3,
    is_active: true,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
describe('createLocationValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validCreateBody() });

    await runValidations(createLocationValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('пропускає, якщо передано тільки name (решта полів необов’язкові)', async () => {
    const req = makeReq({ body: { name: 'Office A' } });

    await runValidations(createLocationValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  describe('name', () => {
    it('обов’язковий', async () => {
      const body = validCreateBody();
      delete body.name;
      const req = makeReq({ body });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('name');
    });

    it('не може складатися тільки з пробілів', async () => {
      const req = makeReq({ body: validCreateBody({ name: '     ' }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('name');
    });

    it('не може бути коротшим за 2 символи', async () => {
      const req = makeReq({ body: validCreateBody({ name: 'A' }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('name');
    });

    it('пробіли по краях не враховуються в довжині', async () => {
      const req = makeReq({ body: validCreateBody({ name: '  AB  ' }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).not.toContain('name');
    });

    it('приймає рівно 255 символів', async () => {
      const req = makeReq({ body: validCreateBody({ name: 'a'.repeat(255) }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).not.toContain('name');
    });

    it('не приймає 256 символів', async () => {
      const req = makeReq({ body: validCreateBody({ name: 'a'.repeat(256) }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('name');
    });
  });

  describe('address', () => {
    it('може бути null', async () => {
      const req = makeReq({ body: validCreateBody({ address: null }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).not.toContain('address');
    });

    it('не може бути довшою за 1000 символів', async () => {
      const req = makeReq({ body: validCreateBody({ address: 'a'.repeat(1001) }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('address');
    });

    it('повертає зрозуміле повідомлення, якщо адреса задовга', async () => {
      const req = makeReq({ body: validCreateBody({ address: 'a'.repeat(1001) }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorMessage(req, 'address')).toBe('Address must not exceed 1000 characters.');
    });
  });

  describe('tenant_id', () => {
    it('може бути null (локація без орендаря)', async () => {
      const req = makeReq({ body: validCreateBody({ tenant_id: null }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).not.toContain('tenant_id');
    });

    it.each([0, -1, 1.5])('відхиляє значення %s', async (value) => {
      const req = makeReq({ body: validCreateBody({ tenant_id: value }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('tenant_id');
    });

    it('відхиляє число, передане рядком ("5")', async () => {
      const req = makeReq({ body: validCreateBody({ tenant_id: '5' }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('tenant_id');
    });
  });

  describe('is_active', () => {
    it.each([true, false])('приймає %s', async (value) => {
      const req = makeReq({ body: validCreateBody({ is_active: value }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).not.toContain('is_active');
    });

    it('відхиляє не булеве значення', async () => {
      const req = makeReq({ body: validCreateBody({ is_active: 'yes' }) });

      await runValidations(createLocationValidation, req);

      expect(getErrorFields(req)).toContain('is_active');
    });
  });
});

// ─────────────────────────────────────────────
describe('updateLocationValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateLocationValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateLocationValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

  it('перевіряє name, якщо його передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { name: 'A' } });

    await runValidations(updateLocationValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });

  it('відхиляє порожній name, якщо його передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { name: '' } });

    await runValidations(updateLocationValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });
});

// ─────────────────────────────────────────────
describe('getLocationByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getLocationByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it.each(['0', '-1', 'abc'])('відхиляє id = "%s"', async (id) => {
    const req = makeReq({ params: { id } });

    await runValidations(getLocationByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getLocationsQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getLocationsQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('приймає is_active = "true" (у query все приходить рядками)', async () => {
    const req = makeReq({ query: { is_active: 'true' } });

    await runValidations(getLocationsQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний is_active', async () => {
    const req = makeReq({ query: { is_active: 'maybe' } });

    await runValidations(getLocationsQueryValidation, req);

    expect(getErrorFields(req)).toContain('is_active');
  });

  it('відхиляє порожній фільтр name', async () => {
    const req = makeReq({ query: { name: '' } });

    await runValidations(getLocationsQueryValidation, req);

    expect(getErrorFields(req)).toContain('name');
  });
});

// ─────────────────────────────────────────────
describe('assignTenantValidation', () => {
  it('приймає коректні locationId і tenantId', async () => {
    const req = makeReq({ params: { locationId: '1', tenantId: '2' } });

    await runValidations(assignTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний tenantId', async () => {
    const req = makeReq({ params: { locationId: '1', tenantId: 'abc' } });

    await runValidations(assignTenantValidation, req);

    expect(getErrorFields(req)).toEqual(['tenantId']);
  });
});

// ─────────────────────────────────────────────
describe('unassignTenantValidation', () => {
  it('відхиляє locationId = 0', async () => {
    const req = makeReq({ params: { locationId: '0' } });

    await runValidations(unassignTenantValidation, req);

    expect(getErrorFields(req)).toContain('locationId');
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
    await runValidations(createLocationValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validCreateBody({ name: 'A' }) });
    await runValidations(createLocationValidation, req);

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