jest.mock('../../../models', () => ({
  EnergyResourceType: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
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
  EnergyResourceType,
  Meter,
  ResourceDelivery,
  MeterTenant,
  sequelize,
} = require('../../../models');
const resourceTypeService = require('../../services/resourceTypeService');

// "Фейковий" запис з бази. У справжнього запису Sequelize є методи update і destroy
function makeType(overrides = {}) {
  return {
    id: 7,
    name: 'Gas',
    unit: 'm3',
    is_active: true,
    update: jest.fn().mockResolvedValue({ id: 7 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

let transaction;

beforeEach(() => {
  // Повністю скидаємо всі моки (і виклики, і задані результати),
  // щоб налаштування з одного тесту не "перетікали" в інший
  jest.resetAllMocks();

  // "Фейкова" транзакція з методами commit і rollback
  transaction = { commit: jest.fn(), rollback: jest.fn() };
  sequelize.transaction.mockResolvedValue(transaction);
});

// ═════════════════════════════════════════════
describe('getAllResourceTypes', () => {
  it('без фільтрів повертає всі типи, відсортовані за назвою', async () => {
    const types = [{ id: 1 }, { id: 2 }];
    EnergyResourceType.findAll.mockResolvedValue(types);

    const result = await resourceTypeService.getAllResourceTypes();

    expect(result).toBe(types);
    expect(EnergyResourceType.findAll).toHaveBeenCalledWith({
      where: {},
      order: [['name', 'ASC']],
    });
  });

  it('фільтрує за is_active', async () => {
    EnergyResourceType.findAll.mockResolvedValue([]);

    await resourceTypeService.getAllResourceTypes({ is_active: false });

    const { where } = EnergyResourceType.findAll.mock.calls[0][0];
    expect(where.is_active).toBe(false);
  });

  it('шукає за частиною назви без урахування регістру (iLike)', async () => {
    EnergyResourceType.findAll.mockResolvedValue([]);

    await resourceTypeService.getAllResourceTypes({ name: 'gas' });

    const { where } = EnergyResourceType.findAll.mock.calls[0][0];
    expect(where.name[Op.iLike]).toBe('%gas%');
  });
});

// ═════════════════════════════════════════════
describe('getResourceTypeById', () => {
  it('повертає знайдений тип', async () => {
    const type = makeType();
    EnergyResourceType.findByPk.mockResolvedValue(type);

    const result = await resourceTypeService.getResourceTypeById(7);

    expect(result).toBe(type);
    expect(EnergyResourceType.findByPk).toHaveBeenCalledWith(7);
  });

  it('кидає помилку, якщо тип не знайдено', async () => {
    EnergyResourceType.findByPk.mockResolvedValue(null);

    await expect(resourceTypeService.getResourceTypeById(999)).rejects.toThrow(
      'Resource type not found'
    );
  });
});

// ═════════════════════════════════════════════
describe('getResourceTypeDependencies', () => {
  it('повертає кількість активних лічильників і поставок', async () => {
    Meter.count.mockResolvedValue(3);
    ResourceDelivery.count.mockResolvedValue(5);

    const result = await resourceTypeService.getResourceTypeDependencies(7);

    expect(result).toEqual({ active_meters: 3, deliveries: 5 });
    expect(Meter.count).toHaveBeenCalledWith({
      where: { energy_resource_type_id: 7, is_active: true },
    });
  });
});

// ═════════════════════════════════════════════
describe('createResourceType', () => {
  it('кидає помилку, якщо немає name, і не звертається до бази', async () => {
    await expect(resourceTypeService.createResourceType({ unit: 'kWh' })).rejects.toThrow(
      'Name and unit are required'
    );

    expect(EnergyResourceType.findOne).not.toHaveBeenCalled();
    expect(EnergyResourceType.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо тип з такою назвою вже існує', async () => {
    EnergyResourceType.findOne.mockResolvedValue({ id: 1, name: 'Gas' });

    await expect(
      resourceTypeService.createResourceType({ name: 'Gas', unit: 'm3' })
    ).rejects.toThrow('Resource type with this name already exists');

    expect(EnergyResourceType.create).not.toHaveBeenCalled();
  });

  it('створює тип, за замовчуванням активний', async () => {
    EnergyResourceType.findOne.mockResolvedValue(null);
    EnergyResourceType.create.mockResolvedValue({ id: 10 });

    const result = await resourceTypeService.createResourceType({ name: 'Water', unit: 'm3' });

    expect(result).toEqual({ id: 10 });
    expect(EnergyResourceType.create).toHaveBeenCalledWith({
      name: 'Water',
      unit: 'm3',
      is_active: true,
    });
  });

  it('створює неактивний тип, якщо передано is_active: false', async () => {
    EnergyResourceType.findOne.mockResolvedValue(null);
    EnergyResourceType.create.mockResolvedValue({ id: 10 });

    await resourceTypeService.createResourceType({ name: 'Water', unit: 'm3', is_active: false });

    expect(EnergyResourceType.create).toHaveBeenCalledWith({
      name: 'Water',
      unit: 'm3',
      is_active: false,
    });
  });
});

// ═════════════════════════════════════════════
describe('updateResourceType', () => {
  it('кидає помилку, якщо тип не знайдено', async () => {
    EnergyResourceType.findByPk.mockResolvedValue(null);

    await expect(resourceTypeService.updateResourceType(999, { unit: 'kWh' })).rejects.toThrow(
      'Resource type not found'
    );
  });

  it('не перевіряє унікальність, якщо назва не змінилась', async () => {
    const type = makeType({ name: 'Gas' });
    EnergyResourceType.findByPk.mockResolvedValue(type);

    await resourceTypeService.updateResourceType(7, { name: 'Gas' });

    expect(EnergyResourceType.findOne).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо нова назва вже зайнята іншим типом', async () => {
    const type = makeType({ name: 'Gas' });
    EnergyResourceType.findByPk.mockResolvedValue(type);
    EnergyResourceType.findOne.mockResolvedValue({ id: 3, name: 'Water' });

    await expect(resourceTypeService.updateResourceType(7, { name: 'Water' })).rejects.toThrow(
      'Resource type with this name already exists'
    );

    expect(type.update).not.toHaveBeenCalled();
  });

  it('оновлює назву, якщо вона вільна', async () => {
    const type = makeType({ name: 'Gas' });
    EnergyResourceType.findByPk.mockResolvedValue(type);
    EnergyResourceType.findOne.mockResolvedValue(null);

    await resourceTypeService.updateResourceType(7, { name: 'Water' });

    expect(type.update).toHaveBeenCalledWith({ name: 'Water' }, { transaction });
  });

  it('оновлює тільки передані поля', async () => {
    const type = makeType();
    EnergyResourceType.findByPk.mockResolvedValue(type);

    await resourceTypeService.updateResourceType(7, { unit: 'kWh' });

    expect(type.update).toHaveBeenCalledWith({ unit: 'kWh' }, { transaction });
  });

  it('при деактивації активного типу деактивує і його лічильники', async () => {
    const type = makeType({ is_active: true });
    EnergyResourceType.findByPk.mockResolvedValue(type);

    await resourceTypeService.updateResourceType(7, { is_active: false });

    expect(Meter.update).toHaveBeenCalledWith(
      { is_active: false },
      { where: { energy_resource_type_id: 7, is_active: true }, transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(type.update).toHaveBeenCalledWith({ is_active: false }, { transaction });
  });

  it('не чіпає лічильники, якщо тип уже неактивний', async () => {
    const type = makeType({ is_active: false });
    EnergyResourceType.findByPk.mockResolvedValue(type);

    await resourceTypeService.updateResourceType(7, { is_active: false });

    expect(Meter.update).not.toHaveBeenCalled();
  });

  it('якщо оновлення типу падає, деактивація лічильників відкочується', async () => {

    const type = makeType({ is_active: true });
    type.update.mockRejectedValue(new Error('DB error'));
    EnergyResourceType.findByPk.mockResolvedValue(type);

    await expect(resourceTypeService.updateResourceType(7, { is_active: false })).rejects.toThrow(
      'DB error'
    );

    expect(Meter.update).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('cascadeDeactivateResourceType', () => {
  it('повертає кількість деактивованих лічильників', async () => {
    Meter.count.mockResolvedValue(4);

    const result = await resourceTypeService.cascadeDeactivateResourceType(7);

    expect(result).toEqual({ deactivated_meters: 4 });
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('відкочує транзакцію і прокидає помилку, якщо оновлення лічильників падає', async () => {
    Meter.update.mockRejectedValue(new Error('DB error'));

    await expect(resourceTypeService.cascadeDeactivateResourceType(7)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('deleteResourceType', () => {
  it('кидає помилку, якщо тип не знайдено', async () => {
    EnergyResourceType.findByPk.mockResolvedValue(null);

    await expect(resourceTypeService.deleteResourceType(999)).rejects.toThrow(
      'Resource type not found'
    );
  });

  it('не дозволяє видалити активний тип і нічого не видаляє', async () => {
    const type = makeType({ is_active: true });
    EnergyResourceType.findByPk.mockResolvedValue(type);

    await expect(resourceTypeService.deleteResourceType(7)).rejects.toThrow(
      'Cannot delete active resource type. Deactivate it first.'
    );

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(type.destroy).not.toHaveBeenCalled();
  });

  it('видаляє неактивний тип разом із залежними записами', async () => {
    const type = makeType({ is_active: false });
    EnergyResourceType.findByPk.mockResolvedValue(type);
    Meter.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await resourceTypeService.deleteResourceType(7);

    expect(MeterTenant.destroy).toHaveBeenCalled();
    expect(Meter.destroy).toHaveBeenCalledWith({ where: { energy_resource_type_id: 7 }, transaction });
    expect(ResourceDelivery.destroy).toHaveBeenCalledWith({
      where: { energy_resource_type_id: 7 },
      transaction,
    });
    expect(transaction.commit).toHaveBeenCalled();
    expect(type.destroy).toHaveBeenCalledWith({ transaction });
  });

  it('якщо видалення типу падає, видалення залежних записів відкочується', async () => {
    const type = makeType({ is_active: false });
    type.destroy.mockRejectedValue(new Error('DB error'));
    EnergyResourceType.findByPk.mockResolvedValue(type);
    Meter.findAll.mockResolvedValue([{ id: 1 }]);

    await expect(resourceTypeService.deleteResourceType(7)).rejects.toThrow('DB error');

    expect(Meter.destroy).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('cascadeDeleteResourceType', () => {
  it('не чіпає прив’язки до орендарів, якщо лічильників немає', async () => {
    Meter.findAll.mockResolvedValue([]);
    ResourceDelivery.count.mockResolvedValue(2);

    const result = await resourceTypeService.cascadeDeleteResourceType(7);

    expect(MeterTenant.count).not.toHaveBeenCalled();
    expect(MeterTenant.destroy).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted_meters: 0, deleted_meter_tenants: 0, deleted_deliveries: 2 });
  });

  it('видаляє прив’язки лічильників і повертає статистику', async () => {
    Meter.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    MeterTenant.count.mockResolvedValue(3);
    ResourceDelivery.count.mockResolvedValue(5);

    const result = await resourceTypeService.cascadeDeleteResourceType(7);

    const destroyArgs = MeterTenant.destroy.mock.calls[0][0];
    expect(destroyArgs.where.meter_id[Op.in]).toEqual([1, 2]);
    expect(destroyArgs.transaction).toBe(transaction);
    expect(result).toEqual({ deleted_meters: 2, deleted_meter_tenants: 3, deleted_deliveries: 5 });
  });

  it('відкочує транзакцію і прокидає помилку, якщо видалення падає', async () => {
    Meter.findAll.mockResolvedValue([]);
    Meter.destroy.mockRejectedValue(new Error('DB error'));

    await expect(resourceTypeService.cascadeDeleteResourceType(7)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});