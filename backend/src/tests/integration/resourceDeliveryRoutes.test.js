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

jest.mock('../../services/resourceDeliveryService', () => ({
  getAllDeliveries: jest.fn(),
  getDeliveryById: jest.fn(),
  createResourceDelivery: jest.fn(),
  updateResourceDelivery: jest.fn(),
  deleteResourceDelivery: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const resourceDeliveryService = require('../../services/resourceDeliveryService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

// Тіло запиту, яке проходить валідацію створення поставки
function validDeliveryBody(overrides = {}) {
  return {
    location_id: 1,
    energy_resource_type_id: 2,
    delivery_date: '2025-03-15',
    quantity: '500',
    unit: 'kWh',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/resource-deliveries', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/resource-deliveries');

    expect(res.status).toBe(401);
    expect(resourceDeliveryService.getAllDeliveries).not.toHaveBeenCalled();
  });

  it('повертає сторінку поставок і загальну кількість, передаючи параметри запиту в сервіс', async () => {
    resourceDeliveryService.getAllDeliveries.mockResolvedValue({ data: [{ id: 1 }], count: 25 });

    const res = await request(app).get('/api/resource-deliveries?page=2&limit=5').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 1 }], count: 25 });
    expect(resourceDeliveryService.getAllDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({ page: '2', limit: '5' })
    );
  });

  it('повертає 422 для некоректної дати у фільтрі', async () => {
    const res = await request(app).get('/api/resource-deliveries?delivery_date=not-a-date').set(USER);

    expect(res.status).toBe(422);
    expect(resourceDeliveryService.getAllDeliveries).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/resource-deliveries/:id', () => {
  it('повертає поставку', async () => {
    resourceDeliveryService.getDeliveryById.mockResolvedValue({ id: 5 });

    const res = await request(app).get('/api/resource-deliveries/5').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 5 } });
  });

  it('повертає 404, якщо поставку не знайдено (сервіс повертає null)', async () => {
    resourceDeliveryService.getDeliveryById.mockResolvedValue(null);

    const res = await request(app).get('/api/resource-deliveries/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Delivery not found' });
  });

  it('повертає 422 для id = 0', async () => {
    const res = await request(app).get('/api/resource-deliveries/0').set(USER);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('POST /api/resource-deliveries', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/resource-deliveries').set(USER).send(validDeliveryBody());

    expect(res.status).toBe(403);
    expect(resourceDeliveryService.createResourceDelivery).not.toHaveBeenCalled();
  });

  it('адміністратору створює поставку і повертає 201', async () => {
    resourceDeliveryService.createResourceDelivery.mockResolvedValue({ id: 10 });

    const res = await request(app).post('/api/resource-deliveries').set(ADMIN).send(validDeliveryBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Delivery created successfully',
      data: { id: 10 },
    });
  });

  it('повертає 422, якщо не передано кількість', async () => {
    const body = validDeliveryBody();
    delete body.quantity;

    const res = await request(app).post('/api/resource-deliveries').set(ADMIN).send(body);

    expect(res.status).toBe(422);
    expect(resourceDeliveryService.createResourceDelivery).not.toHaveBeenCalled();
  });

  it('дублікат поставки повертає 409 з повідомленням сервісу', async () => {
    resourceDeliveryService.createResourceDelivery.mockRejectedValue(
      new Error('Delivery for this location, resource type, and date already exists')
    );

    const res = await request(app).post('/api/resource-deliveries').set(ADMIN).send(validDeliveryBody());

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Delivery for this location, resource type, and date already exists');
  });

  it('неактивна локація повертає 400 з повідомленням сервісу', async () => {
    resourceDeliveryService.createResourceDelivery.mockRejectedValue(
      new Error('Cannot create delivery - location is inactive')
    );

    const res = await request(app).post('/api/resource-deliveries').set(ADMIN).send(validDeliveryBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot create delivery - location is inactive');
  });

  it('"Required fields missing" повертає 400', async () => {
    resourceDeliveryService.createResourceDelivery.mockRejectedValue(new Error('Required fields missing'));

    const res = await request(app).post('/api/resource-deliveries').set(ADMIN).send(validDeliveryBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Required fields missing');
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/resource-deliveries/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/resource-deliveries/5').set(USER).send({ quantity: '700' });

    expect(res.status).toBe(403);
    expect(resourceDeliveryService.updateResourceDelivery).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює поставку', async () => {
    resourceDeliveryService.updateResourceDelivery.mockResolvedValue({ id: 5, quantity: '700' });

    const res = await request(app).put('/api/resource-deliveries/5').set(ADMIN).send({ quantity: '700' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Delivery updated successfully',
      data: { id: 5, quantity: '700' },
    });
    expect(resourceDeliveryService.updateResourceDelivery).toHaveBeenCalledWith('5', { quantity: '700' });
  });

  it('повертає 404, якщо поставку не знайдено', async () => {
    resourceDeliveryService.updateResourceDelivery.mockRejectedValue(new Error('Delivery not found'));

    const res = await request(app).put('/api/resource-deliveries/999').set(ADMIN).send({ quantity: '700' });

    expect(res.status).toBe(404);
  });

  it('дублікат після зміни дати повертає 409', async () => {
    resourceDeliveryService.updateResourceDelivery.mockRejectedValue(
      new Error('Another delivery for this location, resource type and date already exists')
    );

    const res = await request(app)
      .put('/api/resource-deliveries/5')
      .set(ADMIN)
      .send({ delivery_date: '2025-04-01' });

    expect(res.status).toBe(409);
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/resource-deliveries/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/resource-deliveries/5').set(USER);

    expect(res.status).toBe(403);
    expect(resourceDeliveryService.deleteResourceDelivery).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє поставку', async () => {
    resourceDeliveryService.deleteResourceDelivery.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/resource-deliveries/5').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Delivery deleted successfully' });
  });

  it('повертає 404, якщо поставку не знайдено', async () => {
    resourceDeliveryService.deleteResourceDelivery.mockRejectedValue(new Error('Delivery not found'));

    const res = await request(app).delete('/api/resource-deliveries/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});