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

jest.mock('../../services/meterTenantService', () => ({
  getAllMeterTenants: jest.fn(),
  getMeterTenantById: jest.fn(),
  createMeterTenant: jest.fn(),
  updateMeterTenant: jest.fn(),
  deleteMeterTenant: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const meterTenantService = require('../../services/meterTenantService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

// Тіло запиту, яке проходить валідацію створення прив'язки
function validAssignmentBody(overrides = {}) {
  return {
    meter_id: 5,
    tenant_id: 2,
    assigned_from: '2025-01-01',
    assigned_to: '2025-06-30',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/meter-tenants', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/meter-tenants');

    expect(res.status).toBe(401);
    expect(meterTenantService.getAllMeterTenants).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи в сервіс лише відомі фільтри', async () => {
    meterTenantService.getAllMeterTenants.mockResolvedValue([{ id: 1 }]);

    const res = await request(app)
      .get('/api/meter-tenants?tenant_id=2&assigned_from=2025-01-01&foo=bar')
      .set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 1 }], count: 1 });
    expect(meterTenantService.getAllMeterTenants).toHaveBeenCalledWith({
      tenant_id: '2',
      assigned_from: '2025-01-01',
    });
  });

  it('повертає 422 для некоректного meter_id у фільтрі', async () => {
    const res = await request(app).get('/api/meter-tenants?meter_id=x').set(USER);

    expect(res.status).toBe(422);
    expect(meterTenantService.getAllMeterTenants).not.toHaveBeenCalled();
  });

  it('active_only=true шукає прив’язки, чинні сьогодні', async () => {
    meterTenantService.getAllMeterTenants.mockResolvedValue([]);
    const today = new Date().toISOString().split('T')[0];

    await request(app).get('/api/meter-tenants?active_only=true').set(USER);

    expect(meterTenantService.getAllMeterTenants).toHaveBeenCalledWith({
      assigned_from: today,
      assigned_to: today,
    });
  });

  it('active_only=false не додає фільтра за датами', async () => {
    meterTenantService.getAllMeterTenants.mockResolvedValue([]);

    await request(app).get('/api/meter-tenants?active_only=false').set(USER);

    expect(meterTenantService.getAllMeterTenants).toHaveBeenCalledWith({});
  });
});

// ═════════════════════════════════════════════
describe('POST /api/meter-tenants', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/meter-tenants').set(USER).send(validAssignmentBody());

    expect(res.status).toBe(403);
    expect(meterTenantService.createMeterTenant).not.toHaveBeenCalled();
  });

  it('адміністратору створює прив’язку і повертає 201', async () => {
    meterTenantService.createMeterTenant.mockResolvedValue({ id: 10 });

    const res = await request(app).post('/api/meter-tenants').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'MeterTenant created successfully',
      data: { id: 10 },
    });
  });

  it('повертає 422, якщо не передано дату початку', async () => {
    const body = validAssignmentBody();
    delete body.assigned_from;

    const res = await request(app).post('/api/meter-tenants').set(ADMIN).send(body);

    expect(res.status).toBe(422);
    expect(meterTenantService.createMeterTenant).not.toHaveBeenCalled();
  });

  it('повертає 409 при перетині з існуючою прив’язкою', async () => {
    meterTenantService.createMeterTenant.mockRejectedValue(
      new Error('This meter is already assigned to the tenant for the given period')
    );

    const res = await request(app).post('/api/meter-tenants').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('This meter is already assigned to the tenant for the given period');
  });

  it('повертає 404, якщо лічильник не знайдено', async () => {
    meterTenantService.createMeterTenant.mockRejectedValue(new Error('Meter not found'));

    const res = await request(app).post('/api/meter-tenants').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(404);
  });

    it('неактивний лічильник повертає 400 з повідомленням сервісу', async () => {
    meterTenantService.createMeterTenant.mockRejectedValue(new Error('Cannot assign inactive meter'));

    const res = await request(app).post('/api/meter-tenants').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot assign inactive meter');
  });

  it('неактивний орендар повертає 400', async () => {
    meterTenantService.createMeterTenant.mockRejectedValue(new Error('Cannot assign to inactive tenant'));

    const res = await request(app).post('/api/meter-tenants').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/meter-tenants/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/meter-tenants/8').set(USER).send(validAssignmentBody());

    expect(res.status).toBe(403);
    expect(meterTenantService.updateMeterTenant).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює прив’язку', async () => {
    meterTenantService.updateMeterTenant.mockResolvedValue({ id: 8 });

    const res = await request(app).put('/api/meter-tenants/8').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'MeterTenant updated successfully',
      data: { id: 8 },
    });
    expect(meterTenantService.updateMeterTenant).toHaveBeenCalledWith('8', validAssignmentBody());
  });

  it('повертає 404, якщо прив’язку не знайдено', async () => {
    meterTenantService.updateMeterTenant.mockRejectedValue(new Error('MeterTenant not found'));

    const res = await request(app).put('/api/meter-tenants/999').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(404);
  });

  it('при перетині повертає 409 разом зі списком конфліктів від сервісу', async () => {
    const conflict = new Error('Assignment conflict: overlapping period');
    conflict.errors = [{ path: 'meter_id', msg: 'Overlaps with existing assignment from 2025-03-01' }];
    meterTenantService.updateMeterTenant.mockRejectedValue(conflict);

    const res = await request(app).put('/api/meter-tenants/8').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(409);
    expect(res.body.errors).toEqual(conflict.errors);
  });

  it('дозволяє часткове оновлення лише дати завершення', async () => {
    meterTenantService.updateMeterTenant.mockResolvedValue({ id: 8 });

    const res = await request(app)
      .put('/api/meter-tenants/8')
      .set(ADMIN)
      .send({ assigned_to: '2025-06-30' });

    expect(res.status).toBe(200);
    expect(meterTenantService.updateMeterTenant).toHaveBeenCalledWith('8', { assigned_to: '2025-06-30' });
  });

  it('повертає 422, якщо передано обидві дати в неправильному порядку', async () => {
    const res = await request(app)
      .put('/api/meter-tenants/8')
      .set(ADMIN)
      .send({ assigned_from: '2025-06-30', assigned_to: '2025-01-01' });

    expect(res.status).toBe(422);
    expect(meterTenantService.updateMeterTenant).not.toHaveBeenCalled();
  });

  it('дата початку пізніша за завершення (від сервісу) повертає 400', async () => {
    meterTenantService.updateMeterTenant.mockRejectedValue(
      new Error('assigned_from cannot be later than assigned_to')
    );

    const res = await request(app).put('/api/meter-tenants/8').set(ADMIN).send(validAssignmentBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('assigned_from cannot be later than assigned_to');
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/meter-tenants/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/meter-tenants/8').set(USER);

    expect(res.status).toBe(403);
    expect(meterTenantService.deleteMeterTenant).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє прив’язку', async () => {
    meterTenantService.deleteMeterTenant.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/meter-tenants/8').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'MeterTenant deleted successfully' });
  });

  it('повертає 404, якщо прив’язку не знайдено', async () => {
    meterTenantService.deleteMeterTenant.mockRejectedValue(new Error('MeterTenant not found'));

    const res = await request(app).delete('/api/meter-tenants/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});