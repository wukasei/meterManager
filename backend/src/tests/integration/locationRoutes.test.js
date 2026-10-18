// Ключ, під яким Auth0 кладе ролі в токен. Задаємо ДО підключення застосунку
process.env.AUTH0_ROLE_CLAIM_KEY = 'https://energy-api.local/roles';

// ─────────────────────────────────────────────
// Моки (так само, як в інших тестах маршрутів)
// ─────────────────────────────────────────────

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

jest.mock('../../services/locationService', () => ({
  getAllLocations: jest.fn(),
  getLocationById: jest.fn(),
  getLocationDependencies: jest.fn(),
  createLocation: jest.fn(),
  updateLocation: jest.fn(),
  deleteLocation: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const locationService = require('../../services/locationService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

beforeEach(() => {
  jest.resetAllMocks();
  // POST /api/locations проходить через logAuth, який пише в консоль — вимикаємо вивід
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/locations', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(401);
    expect(locationService.getAllLocations).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи фільтри в сервіс', async () => {
    locationService.getAllLocations.mockResolvedValue([{ id: 7 }]);

    const res = await request(app).get('/api/locations?is_active=true&name=office').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 7 }], count: 1 });
    expect(locationService.getAllLocations).toHaveBeenCalledWith({ is_active: 'true', name: 'office' });
  });

  it('повертає 422 для некоректного фільтра is_active', async () => {
    const res = await request(app).get('/api/locations?is_active=maybe').set(USER);

    expect(res.status).toBe(422);
    expect(locationService.getAllLocations).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/locations/:id', () => {
  it('повертає локацію', async () => {
    locationService.getLocationById.mockResolvedValue({ id: 7 });

    const res = await request(app).get('/api/locations/7').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 7 } });
  });

  it('повертає 404, якщо локацію не знайдено', async () => {
    locationService.getLocationById.mockRejectedValue(new Error('Location not found'));

    const res = await request(app).get('/api/locations/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Location not found' });
  });

  it('повертає 422 для некоректного id', async () => {
    const res = await request(app).get('/api/locations/abc').set(USER);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('GET /api/locations/:id/dependencies', () => {
  it('попереджає про активні лічильники', async () => {
    locationService.getLocationDependencies.mockResolvedValue({
      active_meters: 3,
      deliveries: 5,
      active_tenants: 1,
    });

    const res = await request(app).get('/api/locations/7/dependencies').set(USER);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('This location has 3 active meters that will be deactivated');
  });

  it('повідомляє, що активних залежностей немає', async () => {
    locationService.getLocationDependencies.mockResolvedValue({
      active_meters: 0,
      deliveries: 0,
      active_tenants: 0,
    });

    const res = await request(app).get('/api/locations/7/dependencies').set(USER);

    expect(res.body.message).toBe('No active dependent objects');
  });
});

// ═════════════════════════════════════════════
describe('POST /api/locations', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/locations').set(USER).send({ name: 'Office A' });

    expect(res.status).toBe(403);
    expect(locationService.createLocation).not.toHaveBeenCalled();
  });

  it('адміністратору створює локацію і повертає 201', async () => {
    locationService.createLocation.mockResolvedValue({ id: 10, name: 'Office A' });

    const res = await request(app).post('/api/locations').set(ADMIN).send({ name: 'Office A' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Location created successfully',
      data: { id: 10, name: 'Office A' },
    });
  });

  it('повертає 422 для занадто короткої назви', async () => {
    const res = await request(app).post('/api/locations').set(ADMIN).send({ name: 'A' });

    expect(res.status).toBe(422);
    expect(locationService.createLocation).not.toHaveBeenCalled();
  });

  it('повертає 409, якщо локація з такою назвою вже існує', async () => {
    locationService.createLocation.mockRejectedValue(new Error('Location with this name already exists'));

    const res = await request(app).post('/api/locations').set(ADMIN).send({ name: 'Office A' });

    expect(res.status).toBe(409);
  });

  it('повертає 404, якщо вказаного орендаря не знайдено', async () => {
    locationService.createLocation.mockRejectedValue(new Error('Invalid tenant_id: Tenant not found'));

    const res = await request(app)
      .post('/api/locations')
      .set(ADMIN)
      .send({ name: 'Office A', tenant_id: 99 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Invalid tenant_id: Tenant not found');
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/locations/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/locations/7').set(USER).send({ address: 'New st. 5' });

    expect(res.status).toBe(403);
    expect(locationService.updateLocation).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює локацію', async () => {
    locationService.updateLocation.mockResolvedValue({ id: 7, address: 'New st. 5' });

    const res = await request(app).put('/api/locations/7').set(ADMIN).send({ address: 'New st. 5' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Location updated successfully',
      data: { id: 7, address: 'New st. 5' },
    });
    expect(locationService.updateLocation).toHaveBeenCalledWith('7', { address: 'New st. 5' });
  });

  it('повертає 404, якщо локацію не знайдено', async () => {
    locationService.updateLocation.mockRejectedValue(new Error('Location not found'));

    const res = await request(app).put('/api/locations/999').set(ADMIN).send({ address: 'New st. 5' });

    expect(res.status).toBe(404);
  });

  it('при деактивації рахує залежності ДО оновлення і показує їх у повідомленні', async () => {
    locationService.updateLocation.mockResolvedValue({ id: 7, is_active: false });
    // До деактивації в локації 3 активні лічильники
    locationService.getLocationDependencies.mockResolvedValue({
      active_meters: 3,
      deliveries: 5,
      active_tenants: 1,
    });

    const res = await request(app).put('/api/locations/7').set(ADMIN).send({ is_active: false });

    expect(res.body.message).toBe('Location updated successfully (deactivated 3 meters)');
    expect(locationService.getLocationDependencies.mock.invocationCallOrder[0]).toBeLessThan(
      locationService.updateLocation.mock.invocationCallOrder[0]
    );
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/locations/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/locations/7').set(USER);

    expect(res.status).toBe(403);
    expect(locationService.deleteLocation).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє локацію', async () => {
    locationService.deleteLocation.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/locations/7').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Location deleted permanently' });
  });

  it('повертає 400 для активної локації', async () => {
    locationService.deleteLocation.mockRejectedValue(
      new Error('Cannot delete active location. Deactivate it first.')
    );

    const res = await request(app).delete('/api/locations/7').set(ADMIN);

    expect(res.status).toBe(400);
  });

  it('повертає 404, якщо локацію не знайдено', async () => {
    locationService.deleteLocation.mockRejectedValue(new Error('Location not found'));

    const res = await request(app).delete('/api/locations/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});