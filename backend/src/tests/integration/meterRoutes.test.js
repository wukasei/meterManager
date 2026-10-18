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

jest.mock('../../services/meterService', () => ({
  getAllMeters: jest.fn(),
  getMeterById: jest.fn(),
  getMeterDependencies: jest.fn(),
  createMeter: jest.fn(),
  updateMeter: jest.fn(),
  deleteMeter: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const meterService = require('../../services/meterService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

// Тіло запиту, яке проходить валідацію створення лічильника
function validMeterBody(overrides = {}) {
  return {
    serial_number: 'SN-001',
    location_id: 1,
    energy_resource_type_id: 2,
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/meters', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/meters');

    expect(res.status).toBe(401);
    expect(meterService.getAllMeters).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи фільтри в сервіс', async () => {
    meterService.getAllMeters.mockResolvedValue([{ id: 5 }]);

    const res = await request(app).get('/api/meters?is_active=true&location_id=1').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 5 }], count: 1 });
    expect(meterService.getAllMeters).toHaveBeenCalledWith({
      is_active: 'true',
      serial_number: undefined,
      location_id: '1',
      energy_resource_type_id: undefined,
    });
  });

  it('повертає 422 для нечислового location_id', async () => {
    const res = await request(app).get('/api/meters?location_id=abc').set(USER);

    expect(res.status).toBe(422);
    expect(meterService.getAllMeters).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/meters/:id', () => {
  it('повертає лічильник', async () => {
    meterService.getMeterById.mockResolvedValue({ id: 5 });

    const res = await request(app).get('/api/meters/5').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 5 } });
  });

  it('повертає 404, якщо лічильник не знайдено', async () => {
    meterService.getMeterById.mockRejectedValue(new Error('Meter not found'));

    const res = await request(app).get('/api/meters/999').set(USER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Meter not found' });
  });

  it('повертає 422 для id = 0', async () => {
    const res = await request(app).get('/api/meters/0').set(USER);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('GET /api/meters/:id/dependencies', () => {
  it('попереджає про чинні прив’язки', async () => {
    meterService.getMeterDependencies.mockResolvedValue({ active_meter_tenants: 2, deliveries: 0 });

    const res = await request(app).get('/api/meters/5/dependencies').set(USER);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      'This meter has 2 active meter tenants and 0 deliveries that will be affected'
    );
  });

  it('повідомляє, що залежностей немає', async () => {
    meterService.getMeterDependencies.mockResolvedValue({ active_meter_tenants: 0, deliveries: 0 });

    const res = await request(app).get('/api/meters/5/dependencies').set(USER);

    expect(res.body.message).toBe('No active dependent objects');
  });
});

// ═════════════════════════════════════════════
describe('POST /api/meters', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).post('/api/meters').set(USER).send(validMeterBody());

    expect(res.status).toBe(403);
    expect(meterService.createMeter).not.toHaveBeenCalled();
  });

  it('адміністратору створює лічильник і повертає 201', async () => {
    meterService.createMeter.mockResolvedValue({ id: 10 });

    const res = await request(app).post('/api/meters').set(ADMIN).send(validMeterBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Meter created successfully',
      data: { id: 10 },
    });
  });

  it('повертає 422, якщо не передано серійний номер', async () => {
    const body = validMeterBody();
    delete body.serial_number;

    const res = await request(app).post('/api/meters').set(ADMIN).send(body);

    expect(res.status).toBe(422);
    expect(meterService.createMeter).not.toHaveBeenCalled();
  });

  it('повертає 409, якщо лічильник з таким номером уже існує', async () => {
    meterService.createMeter.mockRejectedValue(new Error('Meter with this serial number already exists'));

    const res = await request(app).post('/api/meters').set(ADMIN).send(validMeterBody());

    expect(res.status).toBe(409);
  });

  it('повертає 400 для неактивної локації', async () => {
    meterService.createMeter.mockRejectedValue(new Error('Cannot create meter with inactive location'));

    const res = await request(app).post('/api/meters').set(ADMIN).send(validMeterBody());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot create meter with inactive location');
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/meters/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/meters/5').set(USER).send({ serial_number: 'SN-002' });

    expect(res.status).toBe(403);
    expect(meterService.updateMeter).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює лічильник', async () => {
    meterService.updateMeter.mockResolvedValue({ id: 5, serial_number: 'SN-002' });

    const res = await request(app).put('/api/meters/5').set(ADMIN).send({ serial_number: 'SN-002' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Meter updated successfully',
      data: { id: 5, serial_number: 'SN-002' },
    });
    expect(meterService.updateMeter).toHaveBeenCalledWith('5', { serial_number: 'SN-002' });
  });

  it('повертає 404, якщо лічильник не знайдено', async () => {
    meterService.updateMeter.mockRejectedValue(new Error('Meter not found'));

    const res = await request(app).put('/api/meters/999').set(ADMIN).send({ serial_number: 'SN-002' });

    expect(res.status).toBe(404);
  });

  it('при деактивації рахує прив’язки ДО оновлення і показує їх у повідомленні', async () => {
    meterService.updateMeter.mockResolvedValue({ id: 5, is_active: false });
    // До деактивації в лічильника 2 чинні прив'язки
    meterService.getMeterDependencies.mockResolvedValue({ active_meter_tenants: 2, deliveries: 0 });

    const res = await request(app).put('/api/meters/5').set(ADMIN).send({ is_active: false });

    expect(res.body.message).toBe('Meter updated successfully (deactivated 2 meter tenants)');
    expect(meterService.getMeterDependencies.mock.invocationCallOrder[0]).toBeLessThan(
      meterService.updateMeter.mock.invocationCallOrder[0]
    );
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/meters/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/meters/5').set(USER);

    expect(res.status).toBe(403);
    expect(meterService.deleteMeter).not.toHaveBeenCalled();
  });

  it('адміністратору видаляє лічильник і перелічує видалені прив’язки', async () => {
    meterService.getMeterDependencies.mockResolvedValue({ active_meter_tenants: 2, deliveries: 0 });
    meterService.deleteMeter.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/meters/5').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Meter deleted permanently (also deleted: 2 meter tenants)',
    });
  });

  it('повертає 400 для активного лічильника', async () => {
    meterService.getMeterDependencies.mockResolvedValue({ active_meter_tenants: 0, deliveries: 0 });
    meterService.deleteMeter.mockRejectedValue(new Error('Cannot delete active meter. Deactivate it first.'));

    const res = await request(app).delete('/api/meters/5').set(ADMIN);

    expect(res.status).toBe(400);
  });

  it('повертає 404, якщо лічильник не знайдено', async () => {
    meterService.getMeterDependencies.mockResolvedValue({ active_meter_tenants: 0, deliveries: 0 });
    meterService.deleteMeter.mockRejectedValue(new Error('Meter not found'));

    const res = await request(app).delete('/api/meters/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});