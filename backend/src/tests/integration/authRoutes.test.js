// Ключ, під яким Auth0 кладе ролі в токен. Задаємо ДО підключення застосунку
process.env.AUTH0_ROLE_CLAIM_KEY = 'https://energy-api.local/roles';

// ─────────────────────────────────────────────
// Моки
// ─────────────────────────────────────────────

jest.mock('../../../models', () => ({}));

// Фейковий вхід, як в інших тестах маршрутів, але з можливістю перевизначити sub:
// заголовок x-test-sub зі значенням '' імітує токен без ідентифікатора користувача
jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: () => (req, res, next) => {
    const roles = req.headers['x-test-roles'];
    if (roles === undefined) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const sub = req.headers['x-test-sub'] !== undefined ? req.headers['x-test-sub'] : 'auth0|test-user';
    req.auth = {
      payload: {
        ...(sub ? { sub } : {}),
        'https://energy-api.local/roles': roles ? roles.split(',') : [],
      },
    };
    next();
  },
}));

jest.mock('../../services/authService', () => ({
  syncUser: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../app');
const authService = require('../../services/authService');

const USER = { 'x-test-roles': 'user' };

let logSpy;

beforeEach(() => {
  jest.resetAllMocks();
  // logAuth і контролер пишуть у консоль — вимикаємо вивід
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════
describe('GET /api/auth/verify-token', () => {
  it('без входу повертає 401 і не синхронізує користувача', async () => {
    const res = await request(app).get('/api/auth/verify-token');

    expect(res.status).toBe(401);
    expect(authService.syncUser).not.toHaveBeenCalled();
  });

  it('повертає 401, якщо в токені немає ідентифікатора користувача (sub)', async () => {
    const res = await request(app)
      .get('/api/auth/verify-token')
      .set({ ...USER, 'x-test-sub': '' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(
      'Authorization token invalid or missing user identifier (sub).'
    );
    expect(authService.syncUser).not.toHaveBeenCalled();
  });

  it('синхронізує користувача з даними токена і повертає його', async () => {
    const user = { id: 3, auth0_user_id: 'auth0|test-user', role: 'user', is_active: true };
    authService.syncUser.mockResolvedValue(user);

    const res = await request(app).get('/api/auth/verify-token').set(USER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Token verified and user synchronized successfully.',
      user,
    });
    expect(authService.syncUser).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'auth0|test-user' })
    );
  });

  it('деактивованому користувачу повертає 403 з повідомленням від сервісу', async () => {
    authService.syncUser.mockResolvedValue({
      inactive: true,
      message: 'Your account is deactivated. Contact admin.',
    });

    const res = await request(app).get('/api/auth/verify-token').set(USER);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: 'Your account is deactivated. Contact admin.',
      user: null,
    });
  });

  it('при помилці синхронізації повертає 500 без деталей помилки', async () => {
    authService.syncUser.mockRejectedValue(new Error('User synchronisation error: DB down'));

    const res = await request(app).get('/api/auth/verify-token').set(USER);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: 'Internal server error during token verification and user synchronization.',
    });
  });

  it('logAuth записує в лог лише ідентифікатор користувача', async () => {
    authService.syncUser.mockResolvedValue({ id: 3 });

    await request(app).get('/api/auth/verify-token').set(USER);

    expect(logSpy).toHaveBeenCalledWith('User ID:', 'auth0|test-user');
  });
});