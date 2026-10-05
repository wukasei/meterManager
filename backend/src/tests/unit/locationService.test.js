jest.mock('../../../models', () => ({
  Location: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  Meter: {
    count: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  ResourceDelivery: {
    count: jest.fn(),
    destroy: jest.fn(),
  },
  Tenant: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  MeterTenant: {
    count: jest.fn(),
    destroy: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const {
  Location,
  Meter,
  ResourceDelivery,
  Tenant,
  MeterTenant,
  sequelize,
} = require('../../../models');
const locationService = require('../../services/locationService');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

// "Фейкова" локація з бази
function makeLocation(overrides = {}) {
  return {
    id: 7,
    name: 'Office A',
    tenant_id: null,
    is_active: true,
    update: jest.fn().mockResolvedValue({ id: 7 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

let transaction;

beforeEach(() => {
  jest.resetAllMocks();

  transaction = { commit: jest.fn(), rollback: jest.fn() };
  sequelize.transaction.mockResolvedValue(transaction);

  // Вимикаємо вивід console.log і console.error у терміналі
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════
describe('getAllLocations', () => {
  it('без фільтрів повертає всі локації з орендарями, новіші першими', async () => {
    Location.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await locationService.getAllLocations();

    expect(result).toEqual([{ id: 1 }]);
    const args = Location.findAll.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.order).toEqual([['created_at', 'DESC']]);
    expect(args.include).toHaveLength(1);
  });

  it('фільтрує за is_active', async () => {
    Location.findAll.mockResolvedValue([]);

    await locationService.getAllLocations({ is_active: false });

    const { where } = Location.findAll.mock.calls[0][0];
    expect(where.is_active).toBe(false);
  });

  it('шукає за частиною назви без урахування регістру', async () => {
    Location.findAll.mockResolvedValue([]);

    await locationService.getAllLocations({ name: 'office' });

    const { where } = Location.findAll.mock.calls[0][0];
    expect(where.name[Op.iLike]).toBe('%office%');
  });
});

// ═════════════════════════════════════════════
describe('getLocationById', () => {
  it('повертає знайдену локацію', async () => {
    const location = makeLocation();
    Location.findByPk.mockResolvedValue(location);

    const result = await locationService.getLocationById(7);

    expect(result).toBe(location);
  });

  it('кидає помилку, якщо локацію не знайдено', async () => {
    Location.findByPk.mockResolvedValue(null);

    await expect(locationService.getLocationById(999)).rejects.toThrow('Location not found');
  });
});

// ═════════════════════════════════════════════
describe('createLocation', () => {
  it('кидає помилку, якщо локація з такою назвою вже існує', async () => {
    Location.findOne.mockResolvedValue({ id: 1 });

    await expect(locationService.createLocation({ name: 'Office A' })).rejects.toThrow(
      'Location with this name already exists'
    );
    expect(Location.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо орендаря не знайдено', async () => {
    Location.findOne.mockResolvedValue(null);
    Tenant.findByPk.mockResolvedValue(null);

    await expect(
      locationService.createLocation({ name: 'Office A', tenant_id: 99 })
    ).rejects.toThrow('Invalid tenant_id: Tenant not found');
    expect(Location.create).not.toHaveBeenCalled();
  });

  it('створює активну локацію без орендаря за замовчуванням', async () => {
    Location.findOne.mockResolvedValue(null);
    Location.create.mockResolvedValue({ id: 10 });

    await locationService.createLocation({ name: 'Office A', address: 'Main st. 1' });

    expect(Tenant.findByPk).not.toHaveBeenCalled();
    expect(Location.create).toHaveBeenCalledWith({
      name: 'Office A',
      address: 'Main st. 1',
      tenant_id: null,
      is_active: true,
      occupied_area: null,
    });
  });

  it('створює локацію з існуючим орендарем', async () => {
    Location.findOne.mockResolvedValue(null);
    Tenant.findByPk.mockResolvedValue({ id: 3 });
    Location.create.mockResolvedValue({ id: 10 });

    await locationService.createLocation({ name: 'Office A', tenant_id: 3 });

    expect(Location.create.mock.calls[0][0].tenant_id).toBe(3);
  });
});

// ═════════════════════════════════════════════
describe('updateLocation', () => {
  it('кидає помилку, якщо локацію не знайдено', async () => {
    Location.findByPk.mockResolvedValue(null);

    await expect(locationService.updateLocation(999, { address: 'X' })).rejects.toThrow(
      'Location not found'
    );
  });

  it('кидає помилку, якщо нова назва вже зайнята', async () => {
    const location = makeLocation({ name: 'Office A' });
    Location.findByPk.mockResolvedValue(location);
    Location.findOne.mockResolvedValue({ id: 2 });

    await expect(locationService.updateLocation(7, { name: 'Office B' })).rejects.toThrow(
      'Location with this name already exists'
    );
    expect(location.update).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо нового орендаря не знайдено', async () => {
    const location = makeLocation();
    Location.findByPk.mockResolvedValue(location);
    Tenant.findByPk.mockResolvedValue(null);

    await expect(locationService.updateLocation(7, { tenant_id: 99 })).rejects.toThrow(
      'Invalid tenant_id: Tenant not found'
    );
    expect(location.update).not.toHaveBeenCalled();
  });

  it('tenant_id: null відв’язує орендаря', async () => {
    const location = makeLocation({ tenant_id: 3 });
    Location.findByPk.mockResolvedValue(location);

    await locationService.updateLocation(7, { tenant_id: null });

    expect(location.update).toHaveBeenCalledWith({ tenant_id: null }, { transaction });
  });

  it('оновлює передані поля, зберігаючи поточного орендаря', async () => {
    const location = makeLocation({ tenant_id: 3 });
    Location.findByPk.mockResolvedValue(location);

    await locationService.updateLocation(7, { address: 'New st. 5' });

    expect(location.update).toHaveBeenCalledWith(
      { address: 'New st. 5', tenant_id: 3 },
      { transaction }
    );
  });

  it('при деактивації активної локації деактивує її лічильники в тій самій транзакції', async () => {
    const location = makeLocation({ is_active: true });
    Location.findByPk.mockResolvedValue(location);

    await locationService.updateLocation(7, { is_active: false });

    expect(Meter.update).toHaveBeenCalledWith(
      { is_active: false },
      { where: { location_id: 7, is_active: true }, transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(location.update).toHaveBeenCalledWith(
      { is_active: false, tenant_id: null },
      { transaction }
    );
  });

  it('якщо оновлення локації падає, деактивація лічильників відкочується', async () => {
    const location = makeLocation({ is_active: true });
    location.update.mockRejectedValue(new Error('DB error'));
    Location.findByPk.mockResolvedValue(location);

    await expect(locationService.updateLocation(7, { is_active: false })).rejects.toThrow(
      'DB error'
    );

    expect(Meter.update).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('cascadeDeactivateLocation', () => {
  it('відкочує транзакцію, якщо локацію не знайдено', async () => {
    Location.findByPk.mockResolvedValue(null);

    await expect(locationService.cascadeDeactivateLocation(999)).rejects.toThrow(
      'Location not found'
    );
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it('деактивує лічильники і повертає їх кількість', async () => {
    Location.findByPk.mockResolvedValue(makeLocation({ tenant_id: null }));
    Meter.count.mockResolvedValue(4);

    const result = await locationService.cascadeDeactivateLocation(7);

    expect(result.deactivated_meters).toBe(4);
    expect(Tenant.update).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('деактивує орендаря, якщо в нього не лишилося інших активних локацій', async () => {
    Location.findByPk.mockResolvedValue(makeLocation({ tenant_id: 3 }));
    Location.count.mockResolvedValue(0);
    Tenant.update.mockResolvedValue([1]);

    await locationService.cascadeDeactivateLocation(7);

    expect(Tenant.update).toHaveBeenCalledWith(
      { is_active: false },
      { where: { id: 3, is_active: true }, transaction }
    );
  });

  it('не чіпає орендаря, якщо в нього є інші активні локації', async () => {
    Location.findByPk.mockResolvedValue(makeLocation({ tenant_id: 3 }));
    Location.count.mockResolvedValue(2);

    await locationService.cascadeDeactivateLocation(7);

    expect(Tenant.update).not.toHaveBeenCalled();
  });

  it('повертає кількість деактивованих орендарів числом', async () => {
    Location.findByPk.mockResolvedValue(makeLocation({ tenant_id: 3 }));
    Location.count.mockResolvedValue(0);
    Tenant.update.mockResolvedValue([1]);

    const result = await locationService.cascadeDeactivateLocation(7);

    expect(result.deactivated_tenants).toBe(1);
  });
});

// ═════════════════════════════════════════════
describe('getLocationDependencies', () => {
  it('повертає кількість активних лічильників, поставок і активних орендарів', async () => {
    Meter.count.mockResolvedValue(3);
    ResourceDelivery.count.mockResolvedValue(5);
    Location.count.mockResolvedValue(1);

    const result = await locationService.getLocationDependencies(7);

    expect(result).toEqual({ active_meters: 3, deliveries: 5, active_tenants: 1 });
  });
});

// ═════════════════════════════════════════════
describe('deleteLocation', () => {
  it('не дозволяє видалити активну локацію і нічого не видаляє', async () => {
    const location = makeLocation({ is_active: true });
    Location.findByPk.mockResolvedValue(location);

    await expect(locationService.deleteLocation(7)).rejects.toThrow(
      'Cannot delete active location. Deactivate it first.'
    );
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(location.destroy).not.toHaveBeenCalled();
  });

  it('видаляє неактивну локацію разом із залежними записами в одній транзакції', async () => {
    const location = makeLocation({ is_active: false });
    Location.findByPk.mockResolvedValue(location);
    Meter.findAll.mockResolvedValue([{ id: 1 }]);

    await locationService.deleteLocation(7);

    expect(Meter.destroy).toHaveBeenCalled();
    expect(ResourceDelivery.destroy).toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
    expect(location.destroy).toHaveBeenCalledWith({ transaction });
  });

  it('якщо видалення локації падає, видалення залежних записів відкочується', async () => {
    const location = makeLocation({ is_active: false });
    location.destroy.mockRejectedValue(new Error('DB error'));
    Location.findByPk.mockResolvedValue(location);
    Meter.findAll.mockResolvedValue([]);

    await expect(locationService.deleteLocation(7)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('cascadeDeleteLocation', () => {
  it('видаляє прив’язки лічильників, поставки і самі лічильники', async () => {
    Meter.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await locationService.cascadeDeleteLocation(7);

    const destroyArgs = MeterTenant.destroy.mock.calls[0][0];
    expect(destroyArgs.where.meter_id[Op.in]).toEqual([1, 2]);
    expect(ResourceDelivery.destroy).toHaveBeenCalledWith({
      where: { location_id: 7 },
      transaction,
    });
    expect(Meter.destroy).toHaveBeenCalledWith({ where: { location_id: 7 }, transaction });
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('не чіпає прив’язки, якщо лічильників немає', async () => {
    Meter.findAll.mockResolvedValue([]);

    const result = await locationService.cascadeDeleteLocation(7);

    expect(MeterTenant.destroy).not.toHaveBeenCalled();
    expect(result.deleted_meters).toBe(0);
  });

  it('відкочує транзакцію і прокидає помилку, якщо видалення падає', async () => {
    Meter.findAll.mockResolvedValue([]);
    ResourceDelivery.destroy.mockRejectedValue(new Error('DB error'));

    await expect(locationService.cascadeDeleteLocation(7)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('рахує прив’язки і поставки ДО їх видалення і повертає ці числа', async () => {
    Meter.findAll.mockResolvedValue([{ id: 1 }]);
    MeterTenant.count.mockResolvedValue(3);
    ResourceDelivery.count.mockResolvedValue(5);

    const result = await locationService.cascadeDeleteLocation(7);

    expect(MeterTenant.count.mock.invocationCallOrder[0]).toBeLessThan(
      MeterTenant.destroy.mock.invocationCallOrder[0]
    );
    expect(ResourceDelivery.count.mock.invocationCallOrder[0]).toBeLessThan(
      ResourceDelivery.destroy.mock.invocationCallOrder[0]
    );
    expect(result.deleted_meter_tenants).toBe(3);
    expect(result.deleted_deliveries).toBe(5);
  });
});