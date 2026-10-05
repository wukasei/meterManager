jest.mock('../../../models', () => ({
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const { User } = require('../../../models');
const userService = require('../../services/userService');

// "Фейковий" користувач з бази
function makeUser(overrides = {}) {
  return {
    id: 3,
    full_name: 'Olena Koval',
    role: 'user',
    is_active: true,
    update: jest.fn().mockResolvedValue({ id: 3 }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('getAllUsers', () => {
  it('без фільтрів повертає всіх, крім адміністраторів, новіші першими', async () => {
    User.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await userService.getAllUsers();

    expect(result).toEqual([{ id: 1 }]);
    const args = User.findAll.mock.calls[0][0];
    expect(args.where.role[Op.ne]).toBe('admin');
    expect(args.order).toEqual([['created_at', 'DESC']]);
  });

  it('шукає за частиною імені без урахування регістру', async () => {
    User.findAll.mockResolvedValue([]);

    await userService.getAllUsers({ full_name: 'olena' });

    const { where } = User.findAll.mock.calls[0][0];
    expect(where.full_name[Op.iLike]).toBe('%olena%');
  });

  it('фільтрує за is_active', async () => {
    User.findAll.mockResolvedValue([]);

    await userService.getAllUsers({ is_active: false });

    const { where } = User.findAll.mock.calls[0][0];
    expect(where.is_active).toBe(false);
  });

    it('фільтрує за роллю і при цьому далі приховує адміністраторів', async () => {
    User.findAll.mockResolvedValue([]);

    await userService.getAllUsers({ role: 'manager' });

    const { where } = User.findAll.mock.calls[0][0];
    expect(where.role[Op.eq]).toBe('manager');
    expect(where.role[Op.ne]).toBe('admin');
  });

  it('фільтр role=admin не розкриває адміністраторів', async () => {
    User.findAll.mockResolvedValue([]);

    await userService.getAllUsers({ role: 'admin' });

    const { where } = User.findAll.mock.calls[0][0];
    expect(where.role[Op.ne]).toBe('admin');
  });
});

// ═════════════════════════════════════════════
describe('getUserById', () => {
  it('повертає знайденого користувача', async () => {
    const user = makeUser();
    User.findByPk.mockResolvedValue(user);

    const result = await userService.getUserById(3);

    expect(result).toBe(user);
    expect(User.findByPk).toHaveBeenCalledWith(3);
  });

  it('кидає помилку, якщо користувача не знайдено', async () => {
    User.findByPk.mockResolvedValue(null);

    await expect(userService.getUserById(999)).rejects.toThrow('User not found');
  });
});

// ═════════════════════════════════════════════
describe('updateUser', () => {
  it('кидає помилку, якщо користувача не знайдено', async () => {
    User.findByPk.mockResolvedValue(null);

    await expect(userService.updateUser(999, { full_name: 'X' })).rejects.toThrow(
      'User not found'
    );
  });

  it('оновлює тільки передані поля', async () => {
    const user = makeUser();
    User.findByPk.mockResolvedValue(user);

    await userService.updateUser(3, { full_name: 'Olena Petrenko' });

    expect(user.update).toHaveBeenCalledWith({ full_name: 'Olena Petrenko' });
  });

  it('дозволяє змінити роль звичайного користувача', async () => {
    const user = makeUser({ role: 'user' });
    User.findByPk.mockResolvedValue(user);

    await userService.updateUser(3, { role: 'manager' });

    expect(user.update).toHaveBeenCalledWith({ role: 'manager' });
  });

  it('не дозволяє змінити роль адміністратора', async () => {
    const admin = makeUser({ role: 'admin' });
    User.findByPk.mockResolvedValue(admin);

    await expect(userService.updateUser(3, { role: 'user' })).rejects.toThrow(
      'Cannot change the role of an admin user'
    );
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('дозволяє змінити ім’я адміністратора', async () => {
    const admin = makeUser({ role: 'admin' });
    User.findByPk.mockResolvedValue(admin);

    await userService.updateUser(3, { full_name: 'Main Admin' });

    expect(admin.update).toHaveBeenCalledWith({ full_name: 'Main Admin' });
  });

    it('не дозволяє деактивувати адміністратора через оновлення', async () => {
    const admin = makeUser({ role: 'admin' });
    User.findByPk.mockResolvedValue(admin);

    await expect(userService.updateUser(3, { is_active: false })).rejects.toThrow(
      'Cannot deactivate an admin user'
    );
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('дозволяє деактивувати звичайного користувача через оновлення', async () => {
    const user = makeUser({ role: 'user' });
    User.findByPk.mockResolvedValue(user);

    await userService.updateUser(3, { is_active: false });

    expect(user.update).toHaveBeenCalledWith({ is_active: false });
  });
});

// ═════════════════════════════════════════════
describe('deleteUser', () => {
  it('кидає помилку, якщо користувача не знайдено', async () => {
    User.findByPk.mockResolvedValue(null);

    await expect(userService.deleteUser(999)).rejects.toThrow('User not found');
  });

  it('не дозволяє видалити адміністратора', async () => {
    const admin = makeUser({ role: 'admin' });
    User.findByPk.mockResolvedValue(admin);

    await expect(userService.deleteUser(3)).rejects.toThrow('Cannot delete an admin user.');
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('не видаляє запис, а деактивує користувача (м’яке видалення)', async () => {
    const user = makeUser();
    User.findByPk.mockResolvedValue(user);

    await userService.deleteUser(3);

    expect(user.update).toHaveBeenCalledWith({ is_active: false });
  });
});