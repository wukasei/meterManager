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

jest.mock('../../services/resourceTypeService', () => ({
  getAllResourceTypes: jest.fn(),
  getResourceTypeById: jest.fn(),
  getResourceTypeDependencies: jest.fn(),
  createResourceType: jest.fn(),
  updateResourceType: jest.fn(),
  deleteResourceType: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const resourceTypeService = require('../../services/resourceTypeService');

// Заголовки для запитів від імені адміністратора і звичайного користувача
const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/resource-types', () => {
  it('без входу повертає 401 і не звертається до сервісу', async () => {
    const res = await request(app).get('/api/resource-types');

    expect(res.status).toBe(401);
    expect(resourceTypeService.getAllResourceTypes).not.toHaveBeenCalled();
  });

  it('повертає список і кількість, передаючи фільтри з query', async () => {
    resourceTypeService.getAllResourceTypes.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const res = await request(app)
      .get('/api/resource-types?is_active=true&name=gas')
      .set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 1 }, { id: 2 }], count: 2 });
    expect(resourceTypeService.getAllResourceTypes).toHaveBeenCalledWith({
      is_active: 'true',
      name: 'gas',
    });
  });

  it('повертає 422 для некоректного фільтра і не звертається до сервісу', async () => {
    const res = await request(app).get('/api/resource-types?is_active=maybe').set(USER);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(resourceTypeService.getAllResourceTypes).not.toHaveBeenCalled();
  });

  it('при непередбаченій помилці повертає 500 без деталей помилки', async () => {
    resourceTypeService.getAllResourceTypes.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/resource-types').set(USER);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Internal server error' });
  });
});

// ═════════════════════════════════════════════
describe('GET /api/resource-types/:id', () => {
  it('повертає тип ресурсу', async () => {
    resourceTypeService.getResourceTypeById.mockResolvedValue({ id: 7, name: 'Gas' });

    const res = await request(app).get('/api/resource-types/7').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 7, name: 'Gas' } });
  });

  it('повертає 404, якщо тип не знайдено', async () => {
    resourceTypeService.getResourceTypeById.mockRejectedValue(new Error('Resource type not found'));

    const res = await request(app).get('/api/resource-types/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Resource type not found' });
  });

  it('повертає 422 для некоректного id', async () => {
    const res = await request(app).get('/api/resource-types/abc').set(USER);

    expect(res.status).toBe(422);
    expect(resourceTypeService.getResourceTypeById).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/resource-types/:id/dependencies', () => {
  it('повертає залежності з попередженням, якщо вони є', async () => {
    resourceTypeService.getResourceTypeDependencies.mockResolvedValue({
      active_meters: 2,
      deliveries: 3,
    });

    const res = await request(app).get('/api/resource-types/7/dependencies').set(USER);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ active_meters: 2, deliveries: 3 });
    expect(res.body.message).toBe(
      'This resource type has 2 active meters and 3 deliveries that will be affected'
    );
  });

  it('повідомляє, що залежностей немає', async () => {
    resourceTypeService.getResourceTypeDependencies.mockResolvedValue({
      active_meters: 0,
      deliveries: 0,
    });

    const res = await request(app).get('/api/resource-types/7/dependencies').set(USER);

    expect(res.body.message).toBe('No active dependent objects');
  });
});

// ═════════════════════════════════════════════
describe('POST /api/resource-types', () => {
  it('звичайному користувачу повертає 403 і не створює тип', async () => {
    const res = await request(app)
      .post('/api/resource-types')
      .set(USER)
      .send({ name: 'Gas', unit: 'm3' });

    expect(res.status).toBe(403);
    expect(resourceTypeService.createResourceType).not.toHaveBeenCalled();
  });

  it('адміністратору створює тип і повертає 201', async () => {
    resourceTypeService.createResourceType.mockResolvedValue({ id: 10, name: 'Gas', unit: 'm3' });

    const res = await request(app)
      .post('/api/resource-types')
      .set(ADMIN)
      .send({ name: 'Gas', unit: 'm3' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Resource type created successfully',
      data: { id: 10, name: 'Gas', unit: 'm3' },
    });
  });

  it('повертає 422, якщо не передано назву', async () => {
    const res = await request(app).post('/api/resource-types').set(ADMIN).send({ unit: 'm3' });

    expect(res.status).toBe(422);
    expect(resourceTypeService.createResourceType).not.toHaveBeenCalled();
  });

  it('повертає 409, якщо тип з такою назвою вже існує', async () => {
    resourceTypeService.createResourceType.mockRejectedValue(
      new Error('Resource type with this name already exists')
    );

    const res = await request(app)
      .post('/api/resource-types')
      .set(ADMIN)
      .send({ name: 'Gas', unit: 'm3' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Resource type with this name already exists');
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/resource-types/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/resource-types/7').set(USER).send({ unit: 'kWh' });

    expect(res.status).toBe(403);
    expect(resourceTypeService.updateResourceType).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює тип', async () => {
    resourceTypeService.updateResourceType.mockResolvedValue({ id: 7, unit: 'kWh' });

    const res = await request(app).put('/api/resource-types/7').set(ADMIN).send({ unit: 'kWh' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Resource type updated successfully',
      data: { id: 7, unit: 'kWh' },
    });
    expect(resourceTypeService.updateResourceType).toHaveBeenCalledWith('7', { unit: 'kWh' });
  });

  it('повертає 404, якщо тип не знайдено', async () => {
    resourceTypeService.updateResourceType.mockRejectedValue(new Error('Resource type not found'));

    const res = await request(app).put('/api/resource-types/999').set(ADMIN).send({ unit: 'kWh' });

    expect(res.status).toBe(404);
  });

  it('при деактивації рахує залежності ДО оновлення і показує їх у повідомленні', async () => {
    resourceTypeService.updateResourceType.mockResolvedValue({ id: 7, is_active: false });
    // До деактивації у типу 2 активні лічильники
    resourceTypeService.getResourceTypeDependencies.mockResolvedValue({
      active_meters: 2,
      deliveries: 0,
    });

    const res = await request(app)
      .put('/api/resource-types/7')
      .set(ADMIN)
      .send({ is_active: false });

    expect(res.body.message).toBe('Resource type updated successfully (deactivated 2 meters)');
    expect(resourceTypeService.getResourceTypeDependencies.mock.invocationCallOrder[0]).toBeLessThan(
      resourceTypeService.updateResourceType.mock.invocationCallOrder[0]
    );
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/resource-types/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/resource-types/7').set(USER);

    expect(res.status).toBe(403);
    expect(resourceTypeService.deleteResourceType).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє тип і перелічує видалені залежності', async () => {
    resourceTypeService.getResourceTypeDependencies.mockResolvedValue({
      active_meters: 2,
      deliveries: 3,
    });
    resourceTypeService.deleteResourceType.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/resource-types/7').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Resource type deleted permanently (also deleted: 2 meters, 3 deliveries)',
    });
  });

  it('повертає 400 для активного типу', async () => {
    resourceTypeService.getResourceTypeDependencies.mockResolvedValue({
      active_meters: 0,
      deliveries: 0,
    });
    resourceTypeService.deleteResourceType.mockRejectedValue(
      new Error('Cannot delete active resource type. Deactivate it first.')
    );

    const res = await request(app).delete('/api/resource-types/7').set(ADMIN);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete active resource type. Deactivate it first.');
  });

  it('повертає 404, якщо тип не знайдено', async () => {
    resourceTypeService.getResourceTypeDependencies.mockResolvedValue({
      active_meters: 0,
      deliveries: 0,
    });
    resourceTypeService.deleteResourceType.mockRejectedValue(new Error('Resource type not found'));

    const res = await request(app).delete('/api/resource-types/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});