// Підміняємо бібліотеку Auth0 моком: у тестах нам не потрібна справжня перевірка токенів,
// і без змінних середовища (AUTH0_DOMAIN, AUTH0_AUDIENCE) справжня бібліотека може впасти при імпорті
jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: jest.fn(() => (req, res, next) => next()),
}));

const ROLE_CLAIM_KEY = 'https://energy-api.local/roles';
process.env.AUTH0_ROLE_CLAIM_KEY = ROLE_CLAIM_KEY;

const { checkRole, logAuth } = require('../../middlewares/authMiddleware');

// Допоміжна функція: створює "фейковий" об'єкт res
// mockReturnThis() потрібен, щоб працював ланцюжок res.status(403).json(...)
function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

// Допоміжна функція: створює "фейковий" req з потрібними ролями
function createReqWithRoles(roles) {
  return {
    auth: {
      payload: {
        sub: 'auth0|user123',
        [ROLE_CLAIM_KEY]: roles,
      },
    },
  };
}

describe('authMiddleware', () => {
  let res;
  let next;

  // Перед КОЖНИМ тестом створюємо нові моки, щоб тести не впливали один на одного
  beforeEach(() => {
    res = createMockRes();
    next = jest.fn();
  });

  // ─────────────────────────────────────────────
  describe('checkRole', () => {
    it('пропускає далі (викликає next), якщо в користувача є потрібна роль', () => {
      const req = createReqWithRoles(['admin']);

      checkRole('admin')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('пропускає далі, якщо потрібна роль є серед кількох ролей', () => {
      const req = createReqWithRoles(['tenant', 'admin']);

      checkRole('admin')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('повертає 403, якщо потрібної ролі немає', () => {
      const req = createReqWithRoles(['tenant']);

      checkRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. You do not have the necessary permissions.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо список ролей порожній', () => {
      const req = createReqWithRoles([]);

      checkRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо в токені взагалі немає поля з ролями', () => {
      const req = { auth: { payload: { sub: 'auth0|user123' } } };

      checkRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо req.auth відсутній (користувач не автентифікований)', () => {
      const req = {};

      checkRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('розрізняє регістр: "Admin" не те саме, що "admin"', () => {
      const req = createReqWithRoles(['Admin']);

      checkRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('повертає 403, якщо ролі прийшли рядком, а не масивом', () => {
      const req = createReqWithRoles('superadmin');

      checkRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  describe('logAuth', () => {
    let logSpy;

    beforeEach(() => {
      // Підглядаємо за console.log і вимикаємо справжній вивід, щоб не засмічувати термінал
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      // Повертаємо справжній console.log після тесту
      logSpy.mockRestore();
    });

    it('логує ID користувача і викликає next', () => {
      const req = createReqWithRoles(['admin']);

      logAuth(req, res, next);

      expect(logSpy).toHaveBeenCalledWith('User ID:', 'auth0|user123');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('не падає і викликає next, якщо req.auth відсутній', () => {
      const req = {};

      logAuth(req, res, next);

      expect(logSpy).toHaveBeenCalledWith('User ID:', undefined);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});