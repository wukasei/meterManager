jest.mock('../../../models', () => ({
  Meter: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  MeterTenant: {
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Tenant: {},
  Location: {
    findByPk: jest.fn(),
  },
  EnergyResourceType: {
    findByPk: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const { Meter, MeterTenant, Location, EnergyResourceType, sequelize } = require('../../../models');
const meterService = require('../../services/meterService');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

// "Фейковий" лічильник з бази
function makeMeter(overrides = {}) {
  return {
    id: 5,
    serial_number: 'SN-001',
    location_id: 1,
    energy_resource_type_id: 2,
    is_active: true,
    update: jest.fn().mockResolvedValue({ id: 5 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Локація й тип ресурсу існують і активні, лічильника з таким номером немає
function mockValidReferences() {
  Meter.findOne.mockResolvedValue(null);
  Location.findByPk.mockResolvedValue({ id: 1, is_active: true });
  EnergyResourceType.findByPk.mockResolvedValue({ id: 2, is_active: true });
}

let transaction;

beforeEach(() => {
  jest.resetAllMocks();

  transaction = { commit: jest.fn(), rollback: jest.fn() };
  sequelize.transaction.mockResolvedValue(transaction);
});

// ═════════════════════════════════════════════
describe('getAllMeters', () => {
  it('без фільтрів повертає всі лічильники, новіші першими', async () => {
    Meter.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await meterService.getAllMeters();

    expect(result).toEqual([{ id: 1 }]);
    const args = Meter.findAll.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.order).toEqual([['created_at', 'DESC']]);
  });

  it('застосовує фільтри за активністю, номером, локацією і типом ресурсу', async () => {
    Meter.findAll.mockResolvedValue([]);

    await meterService.getAllMeters({
      is_active: true,
      serial_number: 'SN',
      location_id: 1,
      energy_resource_type_id: 2,
    });

    const { where } = Meter.findAll.mock.calls[0][0];
    expect(where.is_active).toBe(true);
    expect(where.serial_number[Op.iLike]).toBe('%SN%');
    expect(where.location_id).toBe(1);
    expect(where.energy_resource_type_id).toBe(2);
  });
});

// ═════════════════════════════════════════════
describe('getMeterById', () => {
  it('повертає знайдений лічильник', async () => {
    const meter = makeMeter();
    Meter.findByPk.mockResolvedValue(meter);

    const result = await meterService.getMeterById(5);

    expect(result).toBe(meter);
  });

  it('кидає помилку, якщо лічильник не знайдено', async () => {
    Meter.findByPk.mockResolvedValue(null);

    await expect(meterService.getMeterById(999)).rejects.toThrow('Meter not found');
  });
});

// ═════════════════════════════════════════════
describe('getMeterDependencies', () => {
  it('повертає кількість чинних прив’язок до орендарів', async () => {
    MeterTenant.count.mockResolvedValue(2);

    const result = await meterService.getMeterDependencies(5);

    expect(result).toEqual({ active_meter_tenants: 2, deliveries: 0 });
    expect(MeterTenant.count.mock.calls[0][0].where.meter_id).toBe(5);
  });
});

// ═════════════════════════════════════════════
describe('createMeter', () => {
  it('кидає помилку, якщо лічильник з таким номером уже існує', async () => {
    mockValidReferences();
    Meter.findOne.mockResolvedValue({ id: 1 });

    await expect(
      meterService.createMeter({ serial_number: 'SN-001', location_id: 1, energy_resource_type_id: 2 })
    ).rejects.toThrow('Meter with this serial number already exists');
    expect(Meter.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо локацію не знайдено', async () => {
    mockValidReferences();
    Location.findByPk.mockResolvedValue(null);

    await expect(
      meterService.createMeter({ serial_number: 'SN-001', location_id: 1, energy_resource_type_id: 2 })
    ).rejects.toThrow('Location not found');
  });

  it('кидає помилку, якщо локація неактивна', async () => {
    mockValidReferences();
    Location.findByPk.mockResolvedValue({ id: 1, is_active: false });

    await expect(
      meterService.createMeter({ serial_number: 'SN-001', location_id: 1, energy_resource_type_id: 2 })
    ).rejects.toThrow('Cannot create meter with inactive location');
  });

  it('кидає помилку, якщо тип ресурсу неактивний', async () => {
    mockValidReferences();
    EnergyResourceType.findByPk.mockResolvedValue({ id: 2, is_active: false });

    await expect(
      meterService.createMeter({ serial_number: 'SN-001', location_id: 1, energy_resource_type_id: 2 })
    ).rejects.toThrow('Cannot create meter with inactive energy resource type');
  });

  it('створює активний лічильник за замовчуванням', async () => {
    mockValidReferences();
    Meter.create.mockResolvedValue({ id: 10 });

    await meterService.createMeter({ serial_number: 'SN-001', location_id: 1, energy_resource_type_id: 2 });

    expect(Meter.create).toHaveBeenCalledWith({
      serial_number: 'SN-001',
      location_id: 1,
      energy_resource_type_id: 2,
      is_active: true,
    });
  });
});

// ═════════════════════════════════════════════
describe('updateMeter', () => {
  it('кидає помилку, якщо лічильник не знайдено', async () => {
    Meter.findByPk.mockResolvedValue(null);

    await expect(meterService.updateMeter(999, { serial_number: 'X' })).rejects.toThrow(
      'Meter not found'
    );
  });

  it('кидає помилку, якщо новий номер уже зайнятий', async () => {
    const meter = makeMeter();
    Meter.findByPk.mockResolvedValue(meter);
    Meter.findOne.mockResolvedValue({ id: 9 });

    await expect(meterService.updateMeter(5, { serial_number: 'SN-002' })).rejects.toThrow(
      'Meter with this serial number already exists'
    );
    expect(meter.update).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо нова локація неактивна', async () => {
    Meter.findByPk.mockResolvedValue(makeMeter());
    Location.findByPk.mockResolvedValue({ id: 3, is_active: false });

    await expect(meterService.updateMeter(5, { location_id: 3 })).rejects.toThrow(
      'Cannot update meter with inactive location'
    );
  });

  it('оновлює тільки передані поля', async () => {
    const meter = makeMeter();
    Meter.findByPk.mockResolvedValue(meter);
    Meter.findOne.mockResolvedValue(null);

    await meterService.updateMeter(5, { serial_number: 'SN-002' });

    expect(meter.update).toHaveBeenCalledWith({ serial_number: 'SN-002' }, { transaction });
  });

  it('при деактивації активного лічильника закриває його прив’язки в тій самій транзакції', async () => {
    const meter = makeMeter({ is_active: true });
    Meter.findByPk.mockResolvedValue(meter);

    await meterService.updateMeter(5, { is_active: false });

    expect(MeterTenant.update.mock.calls[0][1].transaction).toBe(transaction);
    expect(transaction.commit).toHaveBeenCalled();
    expect(meter.update).toHaveBeenCalledWith({ is_active: false }, { transaction });
  });

  it('не чіпає прив’язки, якщо лічильник уже неактивний', async () => {
    Meter.findByPk.mockResolvedValue(makeMeter({ is_active: false }));

    await meterService.updateMeter(5, { is_active: false });

    expect(MeterTenant.update).not.toHaveBeenCalled();
  });

  it('якщо оновлення лічильника падає, закриття прив’язок відкочується', async () => {
    const meter = makeMeter({ is_active: true });
    meter.update.mockRejectedValue(new Error('DB error'));
    Meter.findByPk.mockResolvedValue(meter);

    await expect(meterService.updateMeter(5, { is_active: false })).rejects.toThrow('DB error');

    expect(MeterTenant.update).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('cascadeDeactivateMeter', () => {
  it('закриває чинні прив’язки поточною датою і повертає їх кількість', async () => {
    MeterTenant.count.mockResolvedValue(2);

    const result = await meterService.cascadeDeactivateMeter(5);

    expect(result).toEqual({ deactivated_meter_tenants: 2 });
    const [values, options] = MeterTenant.update.mock.calls[0];
    expect(values.assigned_to).toEqual(expect.any(Date));
    expect(options.where.meter_id).toBe(5);
    expect(options.transaction).toBe(transaction);
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('відкочує транзакцію і прокидає помилку, якщо оновлення падає', async () => {
    MeterTenant.update.mockRejectedValue(new Error('DB error'));

    await expect(meterService.cascadeDeactivateMeter(5)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

    it('закриває сьогоднішньою датою лише прив’язки, що вже почалися', async () => {
    MeterTenant.count.mockResolvedValue(1);

    await meterService.cascadeDeactivateMeter(5);

    const [values, options] = MeterTenant.update.mock.calls[0];
    // Умова "вже почалася": assigned_from не пізніше за ту саму дату, якою закриваємо
    expect(options.where.assigned_from[Op.lte]).toEqual(values.assigned_to);
  });

  it('видаляє прив’язки, що ще не почалися', async () => {
    MeterTenant.count.mockResolvedValue(1);

    await meterService.cascadeDeactivateMeter(5);

    const { where, transaction: usedTransaction } = MeterTenant.destroy.mock.calls[0][0];
    expect(where.meter_id).toBe(5);
    expect(where.assigned_from[Op.gt]).toEqual(expect.any(Date));
    expect(usedTransaction).toBe(transaction);
  });
});

// ═════════════════════════════════════════════
describe('deleteMeter', () => {
  it('не дозволяє видалити активний лічильник і нічого не видаляє', async () => {
    const meter = makeMeter({ is_active: true });
    Meter.findByPk.mockResolvedValue(meter);

    await expect(meterService.deleteMeter(5)).rejects.toThrow(
      'Cannot delete active meter. Deactivate it first.'
    );
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(meter.destroy).not.toHaveBeenCalled();
  });

  it('видаляє неактивний лічильник разом із прив’язками в одній транзакції', async () => {
    const meter = makeMeter({ is_active: false });
    Meter.findByPk.mockResolvedValue(meter);

    await meterService.deleteMeter(5);

    expect(MeterTenant.destroy).toHaveBeenCalledWith({ where: { meter_id: 5 }, transaction });
    expect(transaction.commit).toHaveBeenCalled();
    expect(meter.destroy).toHaveBeenCalledWith({ transaction });
  });

  it('якщо видалення лічильника падає, видалення прив’язок відкочується', async () => {
    const meter = makeMeter({ is_active: false });
    meter.destroy.mockRejectedValue(new Error('DB error'));
    Meter.findByPk.mockResolvedValue(meter);

    await expect(meterService.deleteMeter(5)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('cascadeDeleteMeter', () => {
  it('видаляє прив’язки лічильника і повертає їх кількість', async () => {
    MeterTenant.count.mockResolvedValue(3);

    const result = await meterService.cascadeDeleteMeter(5);

    expect(result).toEqual({ deleted_meter_tenants: 3, deleted_deliveries: 0 });
    expect(MeterTenant.destroy).toHaveBeenCalledWith({ where: { meter_id: 5 }, transaction });
  });

  it('відкочує транзакцію і прокидає помилку, якщо видалення падає', async () => {
    MeterTenant.destroy.mockRejectedValue(new Error('DB error'));

    await expect(meterService.cascadeDeleteMeter(5)).rejects.toThrow('DB error');

    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});