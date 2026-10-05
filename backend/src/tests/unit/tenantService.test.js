jest.mock('../../../models', () => ({
  Tenant: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  MeterTenant: {
    count: jest.fn(),
    destroy: jest.fn(),
  },
  Location: {
    update: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const { Tenant, MeterTenant, Location, sequelize } = require('../../../models');
const tenantService = require('../../services/tenantService');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

// "Фейковий" орендар з бази з методами update, destroy і reload
function makeTenant(overrides = {}) {
  return {
    id: 10,
    name: 'Tenant LLC',
    is_active: true,
    update: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

let transaction;

beforeEach(() => {
  jest.resetAllMocks();

  transaction = { commit: jest.fn(), rollback: jest.fn() };
  sequelize.transaction.mockResolvedValue(transaction);
});

// ═════════════════════════════════════════════
describe('getAllTenants', () => {
  it('без фільтрів повертає всіх орендарів, новіші першими', async () => {
    Tenant.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await tenantService.getAllTenants();

    expect(result).toEqual([{ id: 1 }]);
    const args = Tenant.findAll.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.order).toEqual([['created_at', 'DESC']]);
    expect(args.include).toHaveLength(2);
  });

  it('фільтрує за is_active', async () => {
    Tenant.findAll.mockResolvedValue([]);

    await tenantService.getAllTenants({ is_active: true });

    const { where } = Tenant.findAll.mock.calls[0][0];
    expect(where.is_active).toBe(true);
  });

  it('шукає за частиною назви без урахування регістру', async () => {
    Tenant.findAll.mockResolvedValue([]);

    await tenantService.getAllTenants({ name: 'llc' });

    const { where } = Tenant.findAll.mock.calls[0][0];
    expect(where.name[Op.iLike]).toBe('%llc%');
  });
});

// ═════════════════════════════════════════════
describe('getTenantById', () => {
  it('повертає знайденого орендаря', async () => {
    const tenant = makeTenant();
    Tenant.findByPk.mockResolvedValue(tenant);

    const result = await tenantService.getTenantById(10);

    expect(result).toBe(tenant);
    expect(Tenant.findByPk.mock.calls[0][0]).toBe(10);
  });

  it('повертає null, якщо орендаря не знайдено (помилку не кидає)', async () => {
    Tenant.findByPk.mockResolvedValue(null);

    const result = await tenantService.getTenantById(999);

    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════
describe('getSimpleTenants', () => {
  it('повертає тільки id і назви активних орендарів за алфавітом', async () => {
    Tenant.findAll.mockResolvedValue([]);

    await tenantService.getSimpleTenants();

    expect(Tenant.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'name'],
      where: { is_active: true },
      order: [['name', 'ASC']],
    });
  });
});

// ═════════════════════════════════════════════
describe('getTenantDependencies', () => {
  it('рахує прив’язки лічильників без дати завершення або з майбутньою датою', async () => {
    MeterTenant.count.mockResolvedValue(3);

    const result = await tenantService.getTenantDependencies(10);

    expect(result).toEqual({ active_meter_tenants: 3 });
    const { where } = MeterTenant.count.mock.calls[0][0];
    expect(where.tenant_id).toBe(10);
    expect(where[Op.or]).toHaveLength(2);
    expect(where[Op.or][0]).toEqual({ assigned_to: null });
  });
});

// ═════════════════════════════════════════════
describe('createTenant', () => {
  it('створює активного орендаря без локацій і повертає його повні дані', async () => {
    const fullTenant = makeTenant();
    Tenant.create.mockResolvedValue({ id: 10 });
    Tenant.findByPk.mockResolvedValue(fullTenant);

    const result = await tenantService.createTenant({ name: 'Tenant LLC' });

    expect(Tenant.create).toHaveBeenCalledWith(
      {
        name: 'Tenant LLC',
        contact_person: undefined,
        phone: undefined,
        email: undefined,
        is_active: true,
      },
      { transaction }
    );
    expect(Location.update).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
    expect(Tenant.findByPk.mock.calls[0][0]).toBe(10);
    expect(result).toBe(fullTenant);
  });

  it('прив’язує передані локації до нового орендаря в тій самій транзакції', async () => {
    Tenant.create.mockResolvedValue({ id: 10 });
    Tenant.findByPk.mockResolvedValue(makeTenant());

    await tenantService.createTenant({ name: 'Tenant LLC', location_ids: [1, 2] });

    expect(Location.update).toHaveBeenCalledTimes(2);
    expect(Location.update).toHaveBeenCalledWith(
      { tenant_id: 10 },
      { where: { id: 1 }, validate: false, transaction }
    );
    expect(Location.update).toHaveBeenCalledWith(
      { tenant_id: 10 },
      { where: { id: 2 }, validate: false, transaction }
    );
  });

  it('якщо прив’язування локацій падає, створення орендаря відкочується', async () => {
    Tenant.create.mockResolvedValue({ id: 10 });
    Location.update.mockRejectedValue(new Error('DB error'));

    await expect(
      tenantService.createTenant({ name: 'Tenant LLC', location_ids: [1] })
    ).rejects.toThrow('DB error');

    expect(Tenant.create).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('updateTenant', () => {
  it('оновлює тільки передані поля і не чіпає локації, якщо location_ids не передано', async () => {
    const tenant = makeTenant();
    Tenant.findByPk.mockResolvedValue(tenant);

    const result = await tenantService.updateTenant(10, { phone: '+380501234567' });

    expect(tenant.update).toHaveBeenCalledWith({ phone: '+380501234567' }, { transaction });
    expect(Location.update).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
    expect(tenant.reload).toHaveBeenCalled();
    expect(result).toBe(tenant);
  });

  it('спершу відв’язує всі локації орендаря, потім прив’язує передані', async () => {
    const tenant = makeTenant();
    Tenant.findByPk.mockResolvedValue(tenant);

    await tenantService.updateTenant(10, { location_ids: [3] });

    expect(Location.update).toHaveBeenNthCalledWith(
      1,
      { tenant_id: null },
      { where: { tenant_id: 10 }, validate: false, transaction }
    );
    expect(Location.update).toHaveBeenNthCalledWith(
      2,
      { tenant_id: 10 },
      { where: { id: 3 }, validate: false, transaction }
    );
  });

  it('порожній location_ids відв’язує всі локації', async () => {
    const tenant = makeTenant();
    Tenant.findByPk.mockResolvedValue(tenant);

    await tenantService.updateTenant(10, { location_ids: [] });

    expect(Location.update).toHaveBeenCalledTimes(1);
    expect(Location.update).toHaveBeenCalledWith(
      { tenant_id: null },
      { where: { tenant_id: 10 }, validate: false, transaction }
    );
  });

  it('якщо прив’язування падає, відв’язування старих локацій відкочується', async () => {
    const tenant = makeTenant();
    Tenant.findByPk.mockResolvedValue(tenant);
    Location.update
      .mockResolvedValueOnce([2]) // перший виклик (відв'язування) — успішний
      .mockRejectedValueOnce(new Error('DB error')); // другий (прив'язування) — падає

    await expect(tenantService.updateTenant(10, { location_ids: [3] })).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('кидає помилку "Tenant not found" для неіснуючого орендаря', async () => {
    Tenant.findByPk.mockResolvedValue(null);

    await expect(tenantService.updateTenant(999, { phone: '1' })).rejects.toThrow(
      'Tenant not found'
    );
    expect(Location.update).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('deleteTenant', () => {
  it('не дозволяє видалити активного орендаря і нічого не змінює', async () => {
    Tenant.findByPk.mockResolvedValue(makeTenant({ is_active: true }));

    await expect(tenantService.deleteTenant(10)).rejects.toThrow(
      'Cannot delete active tenant. Deactivate it first.'
    );

    expect(Location.update).not.toHaveBeenCalled();
    expect(MeterTenant.destroy).not.toHaveBeenCalled();
  });

  it('в одній транзакції відв’язує локації, видаляє прив’язки лічильників і самого орендаря', async () => {
    const tenant = makeTenant({ is_active: false });
    Tenant.findByPk.mockResolvedValue(tenant);

    await tenantService.deleteTenant(10);

    expect(Location.update).toHaveBeenCalledWith(
      { tenant_id: null },
      { where: { tenant_id: 10 }, validate: false, transaction }
    );
    expect(MeterTenant.destroy).toHaveBeenCalledWith({ where: { tenant_id: 10 }, transaction });
    expect(tenant.destroy).toHaveBeenCalledWith({ transaction });
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('якщо видалення орендаря падає, усі зміни відкочуються', async () => {
    const tenant = makeTenant({ is_active: false });
    tenant.destroy.mockRejectedValue(new Error('DB error'));
    Tenant.findByPk.mockResolvedValue(tenant);

    await expect(tenantService.deleteTenant(10)).rejects.toThrow('DB error');

    expect(Location.update).toHaveBeenCalled();
    expect(MeterTenant.destroy).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('кидає помилку "Tenant not found" для неіснуючого орендаря', async () => {
    Tenant.findByPk.mockResolvedValue(null);

    await expect(tenantService.deleteTenant(999)).rejects.toThrow('Tenant not found');
    expect(Location.update).not.toHaveBeenCalled();
    expect(MeterTenant.destroy).not.toHaveBeenCalled();
  });
});