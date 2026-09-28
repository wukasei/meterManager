const {
  updateUserValidation,
  getUserByIdValidation,
  getUsersQueryValidation,
  handleValidationErrors,
} = require('../../middlewares/userValidation');
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

// ─────────────────────────────────────────────
describe('updateUserValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('пропускає коректні дані', async () => {
    const req = makeReq({
      params: { id: '5' },
      body: { full_name: 'Olena Koval', role: 'manager', is_active: false },
    });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });

  it('full_name має бути рядком', async () => {
    const req = makeReq({ params: { id: '5' }, body: { full_name: 123 } });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toContain('full_name');
  });

  it('відхиляє невідому роль з повідомленням про допустимі ролі', async () => {
    const req = makeReq({ params: { id: '5' }, body: { role: 'superuser' } });

    await runValidations(updateUserValidation, req);

    expect(getErrorMessages(req, 'role')).toEqual(['Role must be one of: admin, manager, user.']);
  });

  it('роль чутлива до регістру: "Admin" не приймається', async () => {
    const req = makeReq({ params: { id: '5' }, body: { role: 'Admin' } });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toContain('role');
  });

  it('is_active має бути булевим', async () => {
    const req = makeReq({ params: { id: '5' }, body: { is_active: 'yes' } });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toContain('is_active');
  });

    it('відхиляє порожній full_name', async () => {
    const req = makeReq({ params: { id: '5' }, body: { full_name: '' } });

    await runValidations(updateUserValidation, req);

    expect(getErrorMessages(req, 'full_name')).toEqual(['full_name cannot be empty.']);
  });

  it('відхиляє full_name з самих пробілів', async () => {
    const req = makeReq({ params: { id: '5' }, body: { full_name: '     ' } });

    await runValidations(updateUserValidation, req);

    expect(getErrorMessages(req, 'full_name')).toEqual(['full_name cannot be empty.']);
  });

  it('відхиляє full_name довший за 255 символів', async () => {
    const req = makeReq({ params: { id: '5' }, body: { full_name: 'a'.repeat(256) } });

    await runValidations(updateUserValidation, req);

    expect(getErrorFields(req)).toContain('full_name');
  });
});

// ─────────────────────────────────────────────
describe('getUserByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });

    await runValidations(getUserByIdValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє id = 0', async () => {
    const req = makeReq({ params: { id: '0' } });

    await runValidations(getUserByIdValidation, req);

    expect(getErrorFields(req)).toContain('id');
  });
});

// ─────────────────────────────────────────────
describe('getUsersQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });

    await runValidations(getUsersQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('приймає фільтр за роллю', async () => {
    const req = makeReq({ query: { role: 'admin' } });

    await runValidations(getUsersQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
  });

  it('відхиляє невідому роль у фільтрі', async () => {
    const req = makeReq({ query: { role: 'x' } });

    await runValidations(getUsersQueryValidation, req);

    expect(getErrorFields(req)).toContain('role');
  });

  it('приймає is_active = "true"', async () => {
    const req = makeReq({ query: { is_active: 'true' } });

    await runValidations(getUsersQueryValidation, req);

    expect(getErrorFields(req)).toEqual([]);
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
    const req = makeReq({ params: { id: '5' }, body: {} });
    await runValidations(updateUserValidation, req);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ params: { id: '5' }, body: { role: 'superuser' } });
    await runValidations(updateUserValidation, req);

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