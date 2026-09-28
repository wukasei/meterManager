const {
  createMeterValidation,
  updateMeterValidation,
  getMeterByIdValidation,
  getMetersQueryValidation,
  createMeterTenantValidation,
  updateMeterTenantValidation,
  getMeterTenantByIdValidation,
  getMeterTenantsQueryValidation,
  handleValidationErrors,
} = require('../../middlewares/meterValidation');
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

// Повертає ВСІ тексти помилок для конкретного поля (їх може бути кілька)
function getErrorMessages(req, field) {
  return validationResult(req)
    .array()
    .filter((e) => (e.path || e.param) === field)
    .map((e) => e.msg);
}

function validMeterBody(overrides = {}) {
  return {
    serial_number: 'SN-001',
    location_id: 1,
    energy_resource_type_id: 2,
    is_active: true,
    ...overrides,
  };
}

function validMeterTenantBody(overrides = {}) {
  return {
    meter_id: 1,
    tenant_id: 2,
    assigned_from: '2025-01-01',
    assigned_to: '2025-12-31',
    ...overrides,
  };
}

// ═════════════════════════════════════════════
// ЛІЧИЛЬНИКИ (meters)
// ═════════════════════════════════════════════

describe('createMeterValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validMeterBody() });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('serial_number обов’язковий', async () => {
    const body = validMeterBody();
    delete body.serial_number;
    const req = makeReq({ body });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toContain('serial_number');
  });

  it('serial_number не може складатися тільки з пробілів', async () => {
    const req = makeReq({ body: validMeterBody({ serial_number: '   ' }) });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toContain('serial_number');
  });

  it('serial_number не може бути довшим за 100 символів', async () => {
    const req = makeReq({ body: validMeterBody({ serial_number: 'a'.repeat(101) }) });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toContain('serial_number');
  });

  it('location_id не може бути 0', async () => {
    const req = makeReq({ body: validMeterBody({ location_id: 0 }) });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });

  it('energy_resource_type_id обов’язковий', async () => {
    const body = validMeterBody();
    delete body.energy_resource_type_id;
    const req = makeReq({ body });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toContain('energy_resource_type_id');
  });

  it('is_active має бути булевим', async () => {
    const req = makeReq({ body: validMeterBody({ is_active: 'yes' }) });

    await runValidations(createMeterValidation, req);

    expect(getErrorFields(req)).toContain('is_active');
  });
});

// ─────────────────────────────────────────────
describe('updateMeterValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateMeterValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateMeterValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

  it('відхиляє порожній serial_number, якщо його передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { serial_number: '' } });

    await runValidations(updateMeterValidation, req);

    expect(getErrorFields(req)).toContain('serial_number');
  });

  it('перевіряє location_id, якщо його передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { location_id: 0 } });

    await runValidations(updateMeterValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });
});

// ─────────────────────────────────────────────
describe('getMeterByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getMeterByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getMeterByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getMetersQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getMetersQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('приймає is_active = "true"', async () => {
    const req = makeReq({ query: { is_active: 'true' } });

    await runValidations(getMetersQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє нечисловий location_id', async () => {
    const req = makeReq({ query: { location_id: 'abc' } });

    await runValidations(getMetersQueryValidation, req);

    expect(getErrorFields(req)).toContain('location_id');
  });
});

// ═════════════════════════════════════════════
// ПРИВ'ЯЗКА ЛІЧИЛЬНИКА ДО ОРЕНДАРЯ (meter-tenants)
// ═════════════════════════════════════════════

describe('createMeterTenantValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validMeterTenantBody() });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('assigned_to необов’язкова (прив’язка без дати завершення)', async () => {
    const body = validMeterTenantBody();
    delete body.assigned_to;
    const req = makeReq({ body });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('assigned_to може бути null', async () => {
    const req = makeReq({ body: validMeterTenantBody({ assigned_to: null }) });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє assigned_from з некоректною датою', async () => {
    const req = makeReq({ body: validMeterTenantBody({ assigned_from: 'not-a-date' }) });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorFields(req)).toContain('assigned_from');
  });

  it('відхиляє assigned_to, що раніше за assigned_from', async () => {
    const req = makeReq({
      body: validMeterTenantBody({ assigned_from: '2025-06-01', assigned_to: '2025-01-01' }),
    });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorMessages(req, 'assigned_to')).toContain(
      'Assigned to date must be after assigned from date'
    );
  });

  it('відхиляє assigned_to, що дорівнює assigned_from', async () => {
    const req = makeReq({
      body: validMeterTenantBody({ assigned_from: '2025-06-01', assigned_to: '2025-06-01' }),
    });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorFields(req)).toContain('assigned_to');
  });

    it('без assigned_from повертає одну зрозумілу помилку', async () => {
    const body = validMeterTenantBody();
    delete body.assigned_from;
    const req = makeReq({ body });

    await runValidations(createMeterTenantValidation, req);

    expect(getErrorMessages(req, 'assigned_from')).toEqual(['assigned_from is required']);
  });
});

// ─────────────────────────────────────────────
describe('updateMeterTenantValidation', () => {
  it('пропускає порожній body', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateMeterTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('пропускає коректну пару дат', async () => {
    const req = makeReq({
      params: { id: '5' },
      body: { assigned_from: '2025-01-01', assigned_to: '2025-12-31' },
    });

    await runValidations(updateMeterTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє пару дат, де assigned_from пізніше за assigned_to', async () => {
    const req = makeReq({
      params: { id: '5' },
      body: { assigned_from: '2025-12-31', assigned_to: '2025-01-01' },
    });

    await runValidations(updateMeterTenantValidation, req);

    expect(getErrorFields(req)).toContain('assigned_from');
    expect(getErrorFields(req)).toContain('assigned_to');
  });

  // Характеризаційний тест: якщо передати тільки assigned_to, його ні з чим не порівнюють,
  // бо req.originalAssignedFrom ніде не встановлюється (треба перевірити в services)
  it('[поточна поведінка] пропускає тільки assigned_to без порівняння з датою початку', async () => {
    const req = makeReq({ params: { id: '5' }, body: { assigned_to: '1990-01-01' } });

    await runValidations(updateMeterTenantValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });
});

// ─────────────────────────────────────────────
describe('getMeterTenantByIdValidation', () => {
  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getMeterTenantByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getMeterTenantsQueryValidation', () => {
  it('приймає active_only = "false"', async () => {
    const req = makeReq({ query: { active_only: 'false' } });

    await runValidations(getMeterTenantsQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє нечисловий meter_id', async () => {
    const req = makeReq({ query: { meter_id: 'x' } });

    await runValidations(getMeterTenantsQueryValidation, req);

    expect(getErrorFields(req)).toContain('meter_id');
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
    const req = makeReq({ body: validMeterBody() });
    await runValidations(createMeterValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validMeterBody({ location_id: 0 }) });
    await runValidations(createMeterValidation, req);

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