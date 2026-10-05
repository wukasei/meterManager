jest.mock('../../../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { User } = require('../../../models');
const authService = require('../../services/authService');

const NS = 'https://energy-api.local';

// Вміст токена Auth0 (payload), який приходить у syncUser
function makePayload(overrides = {}) {
  return {
    sub: 'auth0|abc123',
    [`${NS}/email`]: 'olena@example.com',
    [`${NS}/full_name`]: 'Olena Koval',
    [`${NS}/roles`]: ['manager'],
    ...overrides,
  };
}

// "Фейковий" користувач з бази. Його update справді змінює поля об'єкта
// і повертає сам об'єкт — так само, як справжній запис Sequelize
function makeUser(overrides = {}) {
  const user = {
    id: 3,
    auth0_user_id: 'auth0|abc123',
    email: 'olena@example.com',
    full_name: 'Olena Koval',
    role: 'manager',
    is_active: true,
    update: jest.fn(),
    ...overrides,
  };
  user.update.mockImplementation(async (data) => Object.assign(user, data));
  return user;
}

// syncUser викликає User.findOne двічі: спершу за email, потім за auth0_user_id.
// Ця функція налаштовує, що повертати в кожному з випадків
function mockFindOne({ byEmail = null, byAuth0 = null }) {
  User.findOne.mockImplementation(async ({ where }) => (where.email ? byEmail : byAuth0));
}

let logSpy;

beforeEach(() => {
  jest.resetAllMocks();
  // Вимикаємо вивід console.log і console.error, щоб не засмічувати термінал
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════
describe('syncUser — новий користувач', () => {
  it('створює користувача з даними з токена', async () => {
    mockFindOne({});
    User.create.mockImplementation(async (data) => ({ id: 10, ...data }));

    const result = await authService.syncUser(makePayload());

    expect(User.create).toHaveBeenCalledWith({
      auth0_user_id: 'auth0|abc123',
      email: 'olena@example.com',
      full_name: 'Olena Koval',
      role: 'manager',
      is_active: true,
    });
    expect(result).toEqual({
      id: 10,
      auth0_user_id: 'auth0|abc123',
      full_name: 'Olena Koval',
      email: 'olena@example.com',
      role: 'manager',
      is_active: true,
    });
  });

  it('бере ім’я з частини email до @, якщо в токені немає full_name', async () => {
    mockFindOne({});
    User.create.mockImplementation(async (data) => ({ id: 10, ...data }));

    await authService.syncUser(makePayload({ [`${NS}/full_name`]: undefined }));

    expect(User.create.mock.calls[0][0].full_name).toBe('olena');
  });

  it('без email і імені створює "Unknown User" і не шукає за email', async () => {
    mockFindOne({});
    User.create.mockImplementation(async (data) => ({ id: 10, ...data }));

    await authService.syncUser(
      makePayload({ [`${NS}/email`]: undefined, [`${NS}/full_name`]: undefined })
    );

    expect(User.findOne).toHaveBeenCalledTimes(1); // тільки пошук за auth0_user_id
    expect(User.create.mock.calls[0][0].email).toBe('');
    expect(User.create.mock.calls[0][0].full_name).toBe('Unknown User');
  });

  it('без ролей у токені створює користувача з роллю "user"', async () => {
    mockFindOne({});
    User.create.mockImplementation(async (data) => ({ id: 10, ...data }));

    await authService.syncUser(makePayload({ [`${NS}/roles`]: undefined }));

    expect(User.create.mock.calls[0][0].role).toBe('user');
  });
});

// ═════════════════════════════════════════════
describe('syncUser — користувач, створений заздалегідь (знайдений за email)', () => {
  it('прив’язує до нього Auth0-акаунт, а не створює нового', async () => {
    const preCreated = makeUser({ auth0_user_id: null, full_name: 'Old Name', role: 'user' });
    mockFindOne({ byEmail: preCreated, byAuth0: null });

    const result = await authService.syncUser(makePayload());

    expect(User.create).not.toHaveBeenCalled();
    expect(preCreated.update).toHaveBeenCalledWith({
      auth0_user_id: 'auth0|abc123',
      full_name: 'Olena Koval',
      role: 'manager',
    });
    expect(result.auth0_user_id).toBe('auth0|abc123');
  });

  it('блокує вхід, якщо користувача з таким email деактивовано', async () => {
    const inactive = makeUser({ is_active: false });
    mockFindOne({ byEmail: inactive });

    const result = await authService.syncUser(makePayload());

    expect(result).toEqual({
      inactive: true,
      message: 'Your account is deactivated. Contact admin.',
    });
    expect(inactive.update).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  it('без full_name у токені залишає ім’я, задане адміністратором', async () => {
    const preCreated = makeUser({ auth0_user_id: null, full_name: 'Olena Koval' });
    mockFindOne({ byEmail: preCreated, byAuth0: null });

    await authService.syncUser(makePayload({ [`${NS}/full_name`]: undefined }));

    expect(preCreated.update.mock.calls[0][0].full_name).toBe('Olena Koval');
  });
});

// ═════════════════════════════════════════════
describe('syncUser — існуючий користувач (знайдений за auth0_user_id)', () => {
  it('оновлює ім’я, роль і email з токена', async () => {
    const user = makeUser({ full_name: 'Old Name', role: 'user', email: 'old@example.com' });
    mockFindOne({ byEmail: null, byAuth0: user });

    const result = await authService.syncUser(makePayload());

    expect(user.update).toHaveBeenCalledWith({
      full_name: 'Olena Koval',
      role: 'manager',
      email: 'olena@example.com',
    });
    expect(result.full_name).toBe('Olena Koval');
  });

  it('залишає поточну роль, якщо в токені немає ролей', async () => {
    const user = makeUser({ role: 'manager' });
    mockFindOne({ byEmail: user, byAuth0: user });

    await authService.syncUser(makePayload({ [`${NS}/roles`]: undefined }));

    expect(user.update.mock.calls[0][0].role).toBe('manager');
  });

  it('блокує вхід, якщо користувача деактивовано (токен без email)', async () => {
    const inactive = makeUser({ is_active: false });
    mockFindOne({ byAuth0: inactive });

    const result = await authService.syncUser(makePayload({ [`${NS}/email`]: undefined }));

    expect(result.inactive).toBe(true);
    expect(inactive.update).not.toHaveBeenCalled();
  });

  it('без full_name у токені залишає поточне ім’я', async () => {
    const user = makeUser({ full_name: 'Olena Koval' });
    mockFindOne({ byEmail: user, byAuth0: user });

    await authService.syncUser(makePayload({ [`${NS}/full_name`]: undefined }));

    expect(user.update.mock.calls[0][0].full_name).toBe('Olena Koval');
  });
});

// ═════════════════════════════════════════════
describe('syncUser — помилки і логування', () => {
  it('загортає помилку бази у власне повідомлення', async () => {
    User.findOne.mockRejectedValue(new Error('DB down'));

    await expect(authService.syncUser(makePayload())).rejects.toThrow(
      'User synchronisation error: DB down'
    );
  });

  it('не виводить у лог персональні дані з токена', async () => {
    mockFindOne({});
    User.create.mockImplementation(async (data) => ({ id: 10, ...data }));

    await authService.syncUser(makePayload());

    // Збираємо в один рядок усе, що потрапило в console.log, і шукаємо там email та ім'я
    const loggedText = logSpy.mock.calls
      .flat()
      .map((arg) => JSON.stringify(arg))
      .join(' ');
    expect(loggedText).not.toContain('olena@example.com');
    expect(loggedText).not.toContain('Olena Koval');
  });
});