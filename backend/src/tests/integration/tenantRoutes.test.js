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

jest.mock('../../services/tenantService', () => ({
  getAllTenants: jest.fn(),
  getTenantById: jest.fn(),
  getSimpleTenants: jest.fn(),
  getTenantDependencies: jest.fn(),
  createTenant: jest.fn(),
  updateTenant: jest.fn(),
  deleteTenant: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const tenantService = require('../../services/tenantService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/tenants', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/tenants');

    expect(res.status).toBe(401);
    expect(tenantService.getAllTenants).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи фільтри в сервіс', async () => {
    tenantService.getAllTenants.mockResolvedValue([{ id: 1 }]);

    const res = await request(app)
      .get('/api/tenants?is_active=true&name=llc&location_id=1')
      .set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 1 }], count: 1 });
    // location_id передається, але tenantService.getAllTenants його не використовує
    expect(tenantService.getAllTenants).toHaveBeenCalledWith({
      is_active: 'true',
      name: 'llc',
      location_id: '1',
    });
  });

  it('повертає 422 для некоректного location_id', async () => {
    const res = await request(app).get('/api/tenants?location_id=x').set(USER);

    expect(res.status).toBe(422);
    expect(tenantService.getAllTenants).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/tenants/simple', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).get('/api/tenants/simple').set(USER);

    expect(res.status).toBe(403);
    expect(tenantService.getSimpleTenants).not.toHaveBeenCalled();
  });

  it('адміністратору повертає короткий список орендарів', async () => {
    tenantService.getSimpleTenants.mockResolvedValue([{ id: 1, name: 'Tenant LLC' }]);

    const res = await request(app).get('/api/tenants/simple').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 1, name: 'Tenant LLC' }], count: 1 });
  });

  it('слово "simple" не сприймається як id орендаря', async () => {
    tenantService.getSimpleTenants.mockResolvedValue([]);

    await request(app).get('/api/tenants/simple').set(ADMIN);

    expect(tenantService.getTenantById).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/tenants/:id', () => {
  it('повертає орендаря', async () => {
    tenantService.getTenantById.mockResolvedValue({ id: 10 });

    const res = await request(app).get('/api/tenants/10').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 10 } });
  });

  it('повертає 404, якщо орендаря не знайдено (сервіс повертає null)', async () => {
    tenantService.getTenantById.mockResolvedValue(null);

    const res = await request(app).get('/api/tenants/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Tenant not found' });
  });

  it('повертає 422 для некоректного id', async () => {
    const res = await request(app).get('/api/tenants/abc').set(USER);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('GET /api/tenants/:id/dependencies', () => {
  it('попереджає про активні прив’язки лічильників', async () => {
    tenantService.getTenantDependencies.mockResolvedValue({ active_meter_tenants: 3 });

    const res = await request(app).get('/api/tenants/10/dependencies').set(USER);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ active_meter_tenants: 3 });
    expect(res.body.message).toBe('Цей орендар має 3 активних лічильників.');
  });

  it('повідомляє, що залежностей немає', async () => {
    tenantService.getTenantDependencies.mockResolvedValue({ active_meter_tenants: 0 });

    const res = await request(app).get('/api/tenants/10/dependencies').set(USER);

    expect(res.body.message).toBe('Немає активних залежностей');
  });
});

// ═════════════════════════════════════════════
describe('POST /api/tenants', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/tenants').set(USER).send({ name: 'Tenant LLC' });

    expect(res.status).toBe(403);
    expect(tenantService.createTenant).not.toHaveBeenCalled();
  });

  it('адміністратору створює орендаря і повертає 201', async () => {
    tenantService.createTenant.mockResolvedValue({ id: 10, name: 'Tenant LLC' });

    const res = await request(app).post('/api/tenants').set(ADMIN).send({ name: 'Tenant LLC' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Орендаря успішно створено',
      data: { id: 10, name: 'Tenant LLC' },
    });
  });

  it('повертає 422, якщо не передано назву', async () => {
    const res = await request(app).post('/api/tenants').set(ADMIN).send({ phone: '123' });

    expect(res.status).toBe(422);
    expect(tenantService.createTenant).not.toHaveBeenCalled();
  });

  it('при непередбаченій помилці повертає 500 без деталей', async () => {
    tenantService.createTenant.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).post('/api/tenants').set(ADMIN).send({ name: 'Tenant LLC' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/tenants/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/tenants/10').set(USER).send({ phone: '123' });

    expect(res.status).toBe(403);
    expect(tenantService.updateTenant).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює орендаря', async () => {
    tenantService.updateTenant.mockResolvedValue({ id: 10, phone: '123' });

    const res = await request(app).put('/api/tenants/10').set(ADMIN).send({ phone: '123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Орендаря успішно оновлено',
      data: { id: 10, phone: '123' },
    });
    expect(tenantService.updateTenant).toHaveBeenCalledWith('10', { phone: '123' });
  });

  it('повертає 404, якщо орендаря не знайдено', async () => {
    tenantService.updateTenant.mockRejectedValue(new Error('Tenant not found'));

    const res = await request(app).put('/api/tenants/999').set(ADMIN).send({ phone: '123' });

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/tenants/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/tenants/10').set(USER);

    expect(res.status).toBe(403);
    expect(tenantService.deleteTenant).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє орендаря', async () => {
    tenantService.deleteTenant.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/tenants/10').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Орендаря успішно видалено' });
  });

  it('повертає 400 для активного орендаря', async () => {
    tenantService.deleteTenant.mockRejectedValue(
      new Error('Cannot delete active tenant. Deactivate it first.')
    );

    const res = await request(app).delete('/api/tenants/10').set(ADMIN);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete active tenant. Deactivate it first.');
  });

  it('повертає 404, якщо орендаря не знайдено', async () => {
    tenantService.deleteTenant.mockRejectedValue(new Error('Tenant not found'));

    const res = await request(app).delete('/api/tenants/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});