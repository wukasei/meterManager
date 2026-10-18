process.env.AUTH0_ROLE_CLAIM_KEY = 'https://energy-api.local/roles';

jest.mock('../../../models', () => ({}));

jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: () => (req, res, next) => {
    const roles = req.headers['x-test-roles'];
    if (roles === undefined) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.auth = {
      payload: {
        sub: 'auth0|test-user',
        'https://energy-api.local/roles': roles ? roles.split(',') : [],
      },
    };
    next();
  },
}));

jest.mock('../../services/meterReadingService', () => ({
  getAllReadings: jest.fn(),
  getReadingById: jest.fn(),
  createReading: jest.fn(),
  updateReading: jest.fn(),
  deleteReading: jest.fn(),
  getReadingsSummary: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const meterReadingService = require('../../services/meterReadingService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

// Тіло запиту, яке проходить валідацію створення показання
function validReadingBody(overrides = {}) {
  return {
    meter_tenant_id: 3,
    reading_date: '2025-03-15',
    current_reading: '150',
    calculation_method: 'direct',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  // logAuth і sendErrorResponse пишуть у консоль — вимикаємо вивід
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/meter-readings', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/meter-readings');

    expect(res.status).toBe(401);
    expect(meterReadingService.getAllReadings).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи фільтри в сервіс', async () => {
    meterReadingService.getAllReadings.mockResolvedValue([{ id: 77 }]);

    const res = await request(app)
      .get('/api/meter-readings?meter_tenant_id=3&reading_date=2025-03-15&executor_name=ivan')
      .set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 77 }], count: 1 });
    expect(meterReadingService.getAllReadings).toHaveBeenCalledWith({
      meter_tenant_id: '3',
      reading_date: '2025-03-15',
      executor_name: 'ivan',
    });
  });

  it('перетворює записи Sequelize на звичайні об’єкти (toJSON)', async () => {
    meterReadingService.getAllReadings.mockResolvedValue([{ toJSON: () => ({ id: 77, plain: true }) }]);

    const res = await request(app).get('/api/meter-readings').set(USER);

    expect(res.body.data).toEqual([{ id: 77, plain: true }]);
  });

  it('повертає 422 для невідомого методу розрахунку у фільтрі', async () => {
    const res = await request(app).get('/api/meter-readings?calculation_method=magic').set(USER);

    expect(res.status).toBe(422);
    expect(meterReadingService.getAllReadings).not.toHaveBeenCalled();
  });

  it('передає в сервіс фільтри за номером акта і методом розрахунку', async () => {
    meterReadingService.getAllReadings.mockResolvedValue([]);

    await request(app)
      .get('/api/meter-readings?act_number=ACT-1&calculation_method=direct')
      .set(USER);

    const filters = meterReadingService.getAllReadings.mock.calls[0][0];
    expect(filters.act_number).toBe('ACT-1');
    expect(filters.calculation_method).toBe('direct');
  });
});

// ═════════════════════════════════════════════
describe('GET /api/meter-readings/summary', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).get('/api/meter-readings/summary').set(USER);

    expect(res.status).toBe(403);
    expect(meterReadingService.getReadingsSummary).not.toHaveBeenCalled();
  });

  it('адміністратору повертає зведення, передаючи параметри запиту в сервіс', async () => {
    meterReadingService.getReadingsSummary.mockResolvedValue({ Electricity: { totalCost: 320 } });

    const res = await request(app)
      .get('/api/meter-readings/summary?location_id=1&date_from=2025-01-01&date_to=2025-03-31')
      .set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Meter readings summary fetched successfully',
      data: { Electricity: { totalCost: 320 } },
    });
    expect(meterReadingService.getReadingsSummary).toHaveBeenCalledWith({
      location_id: '1',
      date_from: '2025-01-01',
      date_to: '2025-03-31',
    });
  });

  it('слово "summary" не сприймається як id показання', async () => {
    meterReadingService.getReadingsSummary.mockResolvedValue({});

    await request(app).get('/api/meter-readings/summary').set(ADMIN);

    expect(meterReadingService.getReadingById).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/meter-readings/:id', () => {
  it('повертає показання', async () => {
    meterReadingService.getReadingById.mockResolvedValue({ id: 77 });

    const res = await request(app).get('/api/meter-readings/77').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 77 } });
  });

  it('повертає 404, якщо показання не знайдено', async () => {
    meterReadingService.getReadingById.mockRejectedValue(new Error('Meter reading not found'));

    const res = await request(app).get('/api/meter-readings/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Meter reading not found' });
  });

  it('повертає 422 для некоректного id', async () => {
    const res = await request(app).get('/api/meter-readings/abc').set(USER);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('POST /api/meter-readings', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/meter-readings').set(USER).send(validReadingBody());

    expect(res.status).toBe(403);
    expect(meterReadingService.createReading).not.toHaveBeenCalled();
  });

  it('адміністратору створює показання і повертає 201', async () => {
    meterReadingService.createReading.mockResolvedValue({ id: 77 });

    const res = await request(app).post('/api/meter-readings').set(ADMIN).send(validReadingBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Meter reading created successfully',
      data: { id: 77 },
    });
  });

  it('повертає 422, якщо не передано поточне показання', async () => {
    const body = validReadingBody();
    delete body.current_reading;

    const res = await request(app).post('/api/meter-readings').set(ADMIN).send(body);

    expect(res.status).toBe(422);
    expect(meterReadingService.createReading).not.toHaveBeenCalled();
  });

  it('повертає 400, якщо показання менше за попереднє', async () => {
    const message =
      'Invalid meter reading: consumption cannot be negative. New reading must be >= previous reading.';
    meterReadingService.createReading.mockRejectedValue(new Error(message));

    const res = await request(app).post('/api/meter-readings').set(ADMIN).send(validReadingBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('повертає 400 з поясненням, якщо на дату немає тарифу', async () => {
    const message =
      'Invalid: Для цієї локації та типу ресурсу не налаштовано активний Тариф на обрану дату.';
    meterReadingService.createReading.mockRejectedValue(new Error(message));

    const res = await request(app).post('/api/meter-readings').set(ADMIN).send(validReadingBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('повертає 404, якщо прив’язку лічильника не знайдено', async () => {
    meterReadingService.createReading.mockRejectedValue(new Error('Meter tenant not found'));

    const res = await request(app).post('/api/meter-readings').set(ADMIN).send(validReadingBody());

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/meter-readings/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/meter-readings/77').set(USER).send({ notes: 'Checked' });

    expect(res.status).toBe(403);
    expect(meterReadingService.updateReading).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює показання', async () => {
    meterReadingService.updateReading.mockResolvedValue({ id: 77 });

    const res = await request(app).put('/api/meter-readings/77').set(ADMIN).send({ notes: 'Checked' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Meter reading updated successfully',
      data: { id: 77 },
    });
    expect(meterReadingService.updateReading).toHaveBeenCalledWith('77', { notes: 'Checked' });
  });

  it('повертає 404, якщо показання не знайдено', async () => {
    meterReadingService.updateReading.mockRejectedValue(new Error('Meter reading not found'));

    const res = await request(app).put('/api/meter-readings/999').set(ADMIN).send({ notes: 'Checked' });

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/meter-readings/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/meter-readings/77').set(USER);

    expect(res.status).toBe(403);
    expect(meterReadingService.deleteReading).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє показання', async () => {
    meterReadingService.deleteReading.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/meter-readings/77').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Meter reading deleted successfully' });
  });

  it('повертає 404, якщо показання не знайдено', async () => {
    meterReadingService.deleteReading.mockRejectedValue(new Error('Meter reading not found'));

    const res = await request(app).delete('/api/meter-readings/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});