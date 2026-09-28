const {
    createMeterReadingValidation,
    updateMeterReadingValidation,
    getMeterReadingByIdValidation,
    getMeterReadingsQueryValidation,
    handleValidationErrors,
} = require('../../middlewares/meterReadingValidation')
const { validationResult } = require('express-validator');

function makeReq({ body = {}, params = {}, query = {} } = {}) {
  return { body, params, query };
}

async function runValidations(validations, req) {
    for (const validation of validations){
        await validation.run(req);
    }
}

function getErrorFields(req){
    return validationResult(req)
        .array()
        .map((e)=> e.path || e.param);
}

function validCreateBody(overrides = {}) {
  return {
    meter_tenant_id: 1,
    reading_date: '2025-01-31',
    current_reading: '150.5',
    previous_reading: '100',
    calculation_method: 'direct',
    total_cost: '250.50',
    ...overrides, // дозволяє в тесті замінити одне поле, не переписуючи весь об'єкт
  };
}

describe('createMeterReadingValidation', () => {
  it('пропускає коректні дані без помилок', async () => {
    const req = makeReq({ body: validCreateBody() });
 
    await runValidations(createMeterReadingValidation, req);
 
    expect(getErrorFields(req)).toEqual([]);
  });
 
  describe('meter_tenant_id', () => {
    it('обов’язковий', async () => {
      const body = validCreateBody();
      delete body.meter_tenant_id;
      const req = makeReq({ body });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('meter_tenant_id');
    });
 
    it('не може бути 0', async () => {
      const req = makeReq({ body: validCreateBody({ meter_tenant_id: 0 }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('meter_tenant_id');
    });
 
    it('не може бути дробовим', async () => {
      const req = makeReq({ body: validCreateBody({ meter_tenant_id: 1.5 }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('meter_tenant_id');
    });
  });
 
  describe('reading_date', () => {
    it('обов’язкова', async () => {
      const body = validCreateBody();
      delete body.reading_date;
      const req = makeReq({ body });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('reading_date');
    });
 
    it('має бути коректною датою', async () => {
      const req = makeReq({ body: validCreateBody({ reading_date: 'not-a-date' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('reading_date');
    });
  });
 
  describe('числові поля показань', () => {
    it('current_reading не може бути від’ємним', async () => {
      const req = makeReq({ body: validCreateBody({ current_reading: '-5' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('current_reading');
    });
 
    it('current_reading не може бути текстом', async () => {
      const req = makeReq({ body: validCreateBody({ current_reading: 'abc' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('current_reading');
    });
 
    it('current_reading допускає до 4 знаків після коми', async () => {
      const req = makeReq({ body: validCreateBody({ current_reading: '150.1234' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).not.toContain('current_reading');
    });
 
    it('current_reading не допускає 5 знаків після коми', async () => {
      const req = makeReq({ body: validCreateBody({ current_reading: '150.12345' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('current_reading');
    });
 
    it('total_cost не допускає більше 2 знаків після коми', async () => {
      const req = makeReq({ body: validCreateBody({ total_cost: '250.555' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('total_cost');
    });
 
    it('current_reading обов’язковий при створенні', async () => {
      const body = validCreateBody();
      delete body.current_reading;
      const req = makeReq({ body });

      await runValidations(createMeterReadingValidation, req);

      expect(getErrorFields(req)).toContain('current_reading');
    });
  });
 
  describe('calculation_method', () => {
    it('обов’язковий', async () => {
      const body = validCreateBody();
      delete body.calculation_method;
      const req = makeReq({ body });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('calculation_method');
    });
 
    it.each(['direct', 'area_based', 'mixed'])('приймає значення "%s"', async (method) => {
      const req = makeReq({ body: validCreateBody({ calculation_method: method }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).not.toContain('calculation_method');
    });
 
    it('відхиляє невідоме значення', async () => {
      const req = makeReq({ body: validCreateBody({ calculation_method: 'magic' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('calculation_method');
    });
 
    it('обрізає пробіли навколо значення', async () => {
      const req = makeReq({ body: validCreateBody({ calculation_method: '  direct  ' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).not.toContain('calculation_method');
    });
  });
 
  describe('total_rented_area_percentage', () => {
    it.each(['0', '50.5', '100'])('приймає %s', async (value) => {
      const req = makeReq({ body: validCreateBody({ total_rented_area_percentage: value }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).not.toContain('total_rented_area_percentage');
    });
 
    it('відхиляє значення більше 100', async () => {
      const req = makeReq({ body: validCreateBody({ total_rented_area_percentage: '150' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('total_rented_area_percentage');
    });
  });
    describe('rental_area', () => {
    it('приймає додатне значення', async () => {
      const req = makeReq({ body: validCreateBody({ rental_area: '45.5' }) });

      await runValidations(createMeterReadingValidation, req);

      expect(getErrorFields(req)).not.toContain('rental_area');
    });

    it('відхиляє від’ємне значення', async () => {
      const req = makeReq({ body: validCreateBody({ rental_area: '-10' }) });

      await runValidations(createMeterReadingValidation, req);

      expect(getErrorFields(req)).toContain('rental_area');
    });
  });
 
  describe('коефіцієнти', () => {
    it('calculation_coefficient не може дорівнювати 0', async () => {
      const req = makeReq({ body: validCreateBody({ calculation_coefficient: '0' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('calculation_coefficient');
    });
 
    it('energy_consumption_coefficient приймає додатне значення', async () => {
      const req = makeReq({ body: validCreateBody({ energy_consumption_coefficient: '1.25' }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).not.toContain('energy_consumption_coefficient');
    });
  });
 
  describe('текстові поля', () => {
    it('notes не може бути довшим за 5000 символів', async () => {
      const req = makeReq({ body: validCreateBody({ notes: 'a'.repeat(5001) }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('notes');
    });
 
    it('act_number не може бути довшим за 100 символів', async () => {
      const req = makeReq({ body: validCreateBody({ act_number: 'a'.repeat(101) }) });
 
      await runValidations(createMeterReadingValidation, req);
 
      expect(getErrorFields(req)).toContain('act_number');
    });
  });
});
 
describe('updateMeterReadingValidation', () => {
  it('пропускає порожній body — при оновленні всі поля необов’язкові', async () => {
    const req = makeReq({ params: { id: '5' }, body: {} });
 
    await runValidations(updateMeterReadingValidation, req);
 
    expect(getErrorFields(req)).toEqual([]);
  });
 
  it('відхиляє некоректний id у URL', async () => {
    const req = makeReq({ params: { id: 'abc' }, body: {} });
 
    await runValidations(updateMeterReadingValidation, req);
 
    expect(getErrorFields(req)).toContain('id');
  });
 
  it('відхиляє порожній calculation_method, якщо його передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { calculation_method: '' } });
 
    await runValidations(updateMeterReadingValidation, req);
 
    expect(getErrorFields(req)).toContain('calculation_method');
  });
 
  it('перевіряє поля, якщо їх передали', async () => {
    const req = makeReq({ params: { id: '5' }, body: { current_reading: '-10' } });
 
    await runValidations(updateMeterReadingValidation, req);
 
    expect(getErrorFields(req)).toContain('current_reading');
  });
});
 
describe('getMeterReadingByIdValidation', () => {
  it('приймає додатний id', async () => {
    const req = makeReq({ params: { id: '1' } });
 
    await runValidations(getMeterReadingByIdValidation, req);
 
    expect(getErrorFields(req)).toEqual([]);
  });
 
  it.each(['0', '-1', 'abc'])('відхиляє id = "%s"', async (id) => {
    const req = makeReq({ params: { id } });
 
    await runValidations(getMeterReadingByIdValidation, req);
 
    expect(getErrorFields(req)).toContain('id');
  });
});
 
describe('getMeterReadingsQueryValidation', () => {
  it('пропускає запит без фільтрів', async () => {
    const req = makeReq({ query: {} });
 
    await runValidations(getMeterReadingsQueryValidation, req);
 
    expect(getErrorFields(req)).toEqual([]);
  });
 
  it('відхиляє невідомий calculation_method у фільтрі', async () => {
    const req = makeReq({ query: { calculation_method: 'magic' } });
 
    await runValidations(getMeterReadingsQueryValidation, req);
 
    expect(getErrorFields(req)).toContain('calculation_method');
  });
});
 
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
    await runValidations(createMeterReadingValidation, req);
 
    handleValidationErrors(req, res, next);
 
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
 
  it('повертає 422 зі списком помилок, якщо дані некоректні', async () => {
    const req = makeReq({ body: validCreateBody({ meter_tenant_id: 0 }) });
    await runValidations(createMeterReadingValidation, req);
 
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
 