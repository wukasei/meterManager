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

jest.mock('../../services/userService', () => ({
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const userService = require('../../services/userService');

const ADMIN = { 'x-test-roles': 'admin' };
const USER = { 'x-test-roles': 'user' };

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/users', () => {
  it('без входу повертає 401', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(401);
    expect(userService.getAllUsers).not.toHaveBeenCalled();
  });

  it('повертає список, передаючи фільтри в сервіс', async () => {
    userService.getAllUsers.mockResolvedValue([{ id: 3 }]);

    const res = await request(app).get('/api/users?role=manager&is_active=true').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: 3 }], count: 1 });
    expect(userService.getAllUsers).toHaveBeenCalledWith({
      full_name: undefined,
      role: 'manager',
      is_active: 'true',
    });
  });

  it('повертає 422 для невідомої ролі у фільтрі', async () => {
    const res = await request(app).get('/api/users?role=superuser').set(ADMIN);

    expect(res.status).toBe(422);
    expect(userService.getAllUsers).not.toHaveBeenCalled();
  });

  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).get('/api/users').set(USER);

    expect(res.status).toBe(403);
    expect(userService.getAllUsers).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('GET /api/users/:id', () => {

  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).get('/api/users/3').set(USER);

    expect(res.status).toBe(403);
    expect(userService.getUserById).not.toHaveBeenCalled();
  });

  it('повертає користувача', async () => {
    userService.getUserById.mockResolvedValue({ id: 3 });

    const res = await request(app).get('/api/users/3').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 3 } });
  });

  it('повертає 404, якщо користувача не знайдено', async () => {
    userService.getUserById.mockRejectedValue(new Error('User not found'));

    const res = await request(app).get('/api/users/999').set(ADMIN);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'User not found' });
  });

  it('повертає 422 для некоректного id', async () => {
    const res = await request(app).get('/api/users/abc').set(ADMIN);

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════
describe('PUT /api/users/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).put('/api/users/3').set(USER).send({ role: 'manager' });

    expect(res.status).toBe(403);
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('адміністратору оновлює користувача', async () => {
    userService.updateUser.mockResolvedValue({ id: 3, role: 'manager' });

    const res = await request(app).put('/api/users/3').set(ADMIN).send({ role: 'manager' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'User updated successfully',
      data: { id: 3, role: 'manager' },
    });
    expect(userService.updateUser).toHaveBeenCalledWith('3', { role: 'manager' });
  });

  it('повертає 404, якщо користувача не знайдено', async () => {
    userService.updateUser.mockRejectedValue(new Error('User not found'));

    const res = await request(app).put('/api/users/999').set(ADMIN).send({ role: 'manager' });

    expect(res.status).toBe(404);
  });

  it('повертає 422 для порожнього імені', async () => {
    const res = await request(app).put('/api/users/3').set(ADMIN).send({ full_name: '' });

    expect(res.status).toBe(422);
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('зміна ролі адміністратора повертає 400 з поясненням', async () => {
    userService.updateUser.mockRejectedValue(new Error('Cannot change the role of an admin user'));

    const res = await request(app).put('/api/users/1').set(ADMIN).send({ role: 'user' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot change the role of an admin user');
  });

  it('деактивація адміністратора повертає 400 з поясненням', async () => {
    userService.updateUser.mockRejectedValue(new Error('Cannot deactivate an admin user'));

    const res = await request(app).put('/api/users/1').set(ADMIN).send({ is_active: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot deactivate an admin user');
  });
});

// ═════════════════════════════════════════════
describe('DELETE /api/users/:id', () => {
  it('звичайному користувачу повертає 403', async () => {
    const res = await request(app).delete('/api/users/3').set(USER);

    expect(res.status).toBe(403);
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });

  it('повідомляє, що користувача деактивовано (а не видалено)', async () => {
    userService.deleteUser.mockResolvedValue({ id: 3, is_active: false });

    const res = await request(app).delete('/api/users/3').set(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'User deactivated successfully' });
  });

  it('видалення адміністратора повертає 400 з поясненням', async () => {
    userService.deleteUser.mockRejectedValue(new Error('Cannot delete an admin user.'));

    const res = await request(app).delete('/api/users/1').set(ADMIN);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete an admin user.');
  });

  it('повертає 404, якщо користувача не знайдено', async () => {
    userService.deleteUser.mockRejectedValue(new Error('User not found'));

    const res = await request(app).delete('/api/users/999').set(ADMIN);

    expect(res.status).toBe(404);
  });
});