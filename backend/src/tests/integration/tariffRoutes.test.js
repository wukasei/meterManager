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

jest.mock('../../services/tariffService', () => ({
  getAllTariffs: jest.fn(),
  getTariffById: jest.fn(),
  createTariff: jest.fn(),
  updateTariff: jest.fn(),
  deleteTariff: jest.fn(),
  getApplicableTariff: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const tariffService = require('../../services/tariffService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

// Тіло запиту, яке проходить валідацію створення тарифу
function validTariffBody(overrides = {}) {
  return {
    location_id: 1,
    energy_resource_type_id: 2,
    price: '4.32',
    valid_from: '2025-01-01',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/tariffs', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/tariffs');

    expect(res.status).toBe(401);
    expect(tariffService.getAllTariffs).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи фільтри в сервіс', async () => {
    tariffService.getAllTariffs.mockResolvedValue([{ id: 4 }]);

    const res = await request(app)
      .get('/api/tariffs?location_id=1&valid_from=2025-01-01')
      .set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 4 }], count: 1 });
    expect(tariffService.getAllTariffs).toHaveBeenCalledWith({
      location_id: '1',
      energy_resource_type_id: undefined,
      valid_from: '2025-01-01',
      valid_to: undefined,
    });
  });

  it('повертає 422 для некоректної дати у фільтрі', async () => {
    const res = await request(app).get('/api/tariffs?valid_from=01.01.2025').set(USER);

    expect(res.status).toBe(422);
    expect(tariffService.getAllTariffs).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/tariffs/:id', () => {
  it('повертає тариф', async () => {
    tariffService.getTariffById.mockResolvedValue({ id: 4 });

    const res = await request(app).get('/api/tariffs/4').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 4 } });
  });

  it('повертає 404, якщо тариф не знайдено', async () => {
    tariffService.getTariffById.mockRejectedValue(new Error('Tariff not found'));

    const res = await request(app).get('/api/tariffs/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Tariff not found' });
  });

  it('повертає 422 для некоректного id', async () => {
    const res = await request(app).get('/api/tariffs/abc').set(USER);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('GET /api/tariffs/applicable', () => {
  it('знаходить тариф, чинний на вказану дату', async () => {
    tariffService.getApplicableTariff.mockResolvedValue({ id: 4, price: '4.32' });

    const res = await request(app)
      .get('/api/tariffs/applicable?location_id=1&energy_resource_type_id=2&reading_date=2025-03-15')
      .set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 4, price: '4.32' } });
    expect(tariffService.getApplicableTariff).toHaveBeenCalledWith('1', '2', '2025-03-15');
  });

    it('повертає 400, якщо не передано обов’язкові параметри', async () => {
    const res = await request(app)
      .get('/api/tariffs/applicable?location_id=1&energy_resource_type_id=2')
      .set(USER);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Location ID, Resource Type ID, and Reading Date are required filters.'
    );
    expect(tariffService.getApplicableTariff).not.toHaveBeenCalled();
  });

  it('повертає 400 для некоректної дати', async () => {
    tariffService.getApplicableTariff.mockRejectedValue(new Error('Invalid reading_date: abc'));

    const res = await request(app)
      .get('/api/tariffs/applicable?location_id=1&energy_resource_type_id=2&reading_date=abc')
      .set(USER);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid reading_date: abc');
  });

  it('повертає 400 з поясненням, якщо на дату немає тарифу', async () => {
    const message =
      'Invalid: Для цієї локації та типу ресурсу не налаштовано активний Тариф на обрану дату.';
    tariffService.getApplicableTariff.mockRejectedValue(new Error(message));

    const res = await request(app)
      .get('/api/tariffs/applicable?location_id=1&energy_resource_type_id=2&reading_date=2025-03-15')
      .set(USER);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('при непередбаченій помилці повертає 500 без деталей', async () => {
    tariffService.getApplicableTariff.mockRejectedValue(new Error('connection refused'));

    const res = await request(app)
      .get('/api/tariffs/applicable?location_id=1&energy_resource_type_id=2&reading_date=2025-03-15')
      .set(USER);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});

// ═════════════════════════════════════════════
describe('POST /api/tariffs', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/tariffs').set(USER).send(validTariffBody());

    expect(res.status).toBe(403);
    expect(tariffService.createTariff).not.toHaveBeenCalled();
  });

  it('адміністратору створює тариф і повертає 201', async () => {
    tariffService.createTariff.mockResolvedValue({ id: 10 });

    const res = await request(app).post('/api/tariffs').set(ADMIN).send(validTariffBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Tariff created successfully',
      data: { id: 10 },
    });
  });

  it('повертає 422, якщо не передано ціну', async () => {
    const body = validTariffBody();
    delete body.price;

    const res = await request(app).post('/api/tariffs').set(ADMIN).send(body);

    expect(res.status).toBe(422);
    expect(tariffService.createTariff).not.toHaveBeenCalled();
  });

  it('повертає 409 при перетині періодів', async () => {
    tariffService.createTariff.mockRejectedValue(
      new Error('Overlapping tariff period exists for this resource and location')
    );

    const res = await request(app).post('/api/tariffs').set(ADMIN).send(validTariffBody());

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Overlapping tariff period exists for this resource and location');
  });

  it('неактивна локація повертає 400 з повідомленням сервісу', async () => {
    tariffService.createTariff.mockRejectedValue(new Error('Cannot create tariff - location is inactive'));

    const res = await request(app).post('/api/tariffs').set(ADMIN).send(validTariffBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot create tariff - location is inactive');
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/tariffs/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/tariffs/4').set(USER).send({ price: '5.10' });

    expect(res.status).toBe(403);
    expect(tariffService.updateTariff).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює тариф', async () => {
    tariffService.updateTariff.mockResolvedValue({ id: 4, price: '5.10' });

    const res = await request(app).put('/api/tariffs/4').set(ADMIN).send({ price: '5.10' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Tariff updated successfully',
      data: { id: 4, price: '5.10' },
    });
    expect(tariffService.updateTariff).toHaveBeenCalledWith('4', { price: '5.10' });
  });

  it('повертає 404, якщо тариф не знайдено', async () => {
    tariffService.updateTariff.mockRejectedValue(new Error('Tariff not found'));

    const res = await request(app).put('/api/tariffs/999').set(ADMIN).send({ price: '5.10' });

    expect(res.status).toBe(404);
  });

  it('повертає 409 при перетині оновленого періоду', async () => {
    tariffService.updateTariff.mockRejectedValue(new Error('Updated period overlaps with existing tariff'));

    const res = await request(app).put('/api/tariffs/4').set(ADMIN).send({ valid_from: '2025-02-01' });

    expect(res.status).toBe(409);
  });

  it('дата завершення раніша за збережену дату початку повертає 400', async () => {
    tariffService.updateTariff.mockRejectedValue(new Error('valid_to must be after valid_from'));

    const res = await request(app).put('/api/tariffs/4').set(ADMIN).send({ valid_to: '2024-06-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('valid_to must be after valid_from');
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/tariffs/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/tariffs/4').set(USER);

    expect(res.status).toBe(403);
    expect(tariffService.deleteTariff).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє тариф', async () => {
    tariffService.deleteTariff.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/tariffs/4').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Tariff deleted permanently' });
  });

  it('повертає 404, якщо тариф не знайдено', async () => {
    tariffService.deleteTariff.mockRejectedValue(new Error('Tariff not found'));

    const res = await request(app).delete('/api/tariffs/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});