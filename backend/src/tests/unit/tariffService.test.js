jest.mock('../../../models', () => ({
  Tariff: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Location: {
    findByPk: jest.fn(),
  },
  EnergyResourceType: {
    findByPk: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const { Tariff, Location, EnergyResourceType } = require('../../../models');
const tariffService = require('../../services/tariffService');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

const FAR_FUTURE = new Date('9999-12-31');

function validCreateData(overrides = {}) {
  return {
    location_id: 1,
    energy_resource_type_id: 2,
    price: 4.32,
    valid_from: '2025-01-01',
    valid_to: '2025-12-31',
    ...overrides,
  };
}

// "Фейковий" тариф з бази
function makeTariff(overrides = {}) {
  return {
    id: 4,
    location_id: 1,
    energy_resource_type_id: 2,
    price: '4.32',
    valid_from: '2025-01-01',
    valid_to: null,
    update: jest.fn().mockResolvedValue({ id: 4 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Локація й тип ресурсу існують і активні, перетину періодів немає
function mockValidReferences() {
  Location.findByPk.mockResolvedValue({ id: 1, is_active: true });
  EnergyResourceType.findByPk.mockResolvedValue({ id: 2, is_active: true });
  Tariff.findOne.mockResolvedValue(null);
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('getAllTariffs', () => {
  it('без фільтрів повертає всі тарифи, новіші першими', async () => {
    Tariff.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await tariffService.getAllTariffs();

    expect(result).toEqual([{ id: 1 }]);
    const args = Tariff.findAll.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.order).toEqual([['valid_from', 'DESC']]);
  });

  it('фільтрує за локацією і типом ресурсу', async () => {
    Tariff.findAll.mockResolvedValue([]);

    await tariffService.getAllTariffs({ location_id: 1, energy_resource_type_id: 2 });

    const { where } = Tariff.findAll.mock.calls[0][0];
    expect(where.location_id).toBe(1);
    expect(where.energy_resource_type_id).toBe(2);
  });

  it('фільтр valid_from шукає тарифи, що почали діяти з цієї дати', async () => {
    Tariff.findAll.mockResolvedValue([]);

    await tariffService.getAllTariffs({ valid_from: '2025-01-01' });

    const { where } = Tariff.findAll.mock.calls[0][0];
    expect(where.valid_from[Op.gte]).toBe('2025-01-01');
  });

  it('фільтр valid_to шукає тарифи, що закінчились до дати, або безстрокові', async () => {
    Tariff.findAll.mockResolvedValue([]);

    await tariffService.getAllTariffs({ valid_to: '2025-12-31' });

    const { where } = Tariff.findAll.mock.calls[0][0];
    expect(where[Op.or]).toEqual([{ valid_to: { [Op.lte]: '2025-12-31' } }, { valid_to: null }]);
  });
});

// ═════════════════════════════════════════════
describe('getTariffById', () => {
  it('повертає знайдений тариф', async () => {
    const tariff = makeTariff();
    Tariff.findByPk.mockResolvedValue(tariff);

    const result = await tariffService.getTariffById(4);

    expect(result).toBe(tariff);
  });

  it('кидає помилку, якщо тариф не знайдено', async () => {
    Tariff.findByPk.mockResolvedValue(null);

    await expect(tariffService.getTariffById(999)).rejects.toThrow('Tariff not found');
  });
});

// ═════════════════════════════════════════════
describe('createTariff', () => {
  it('кидає помилку, якщо бракує обов’язкового поля', async () => {
    const data = validCreateData();
    delete data.valid_from;

    await expect(tariffService.createTariff(data)).rejects.toThrow(
      'Location, energy resource type, price and valid_from are required'
    );
    expect(Location.findByPk).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо локацію не знайдено', async () => {
    mockValidReferences();
    Location.findByPk.mockResolvedValue(null);

    await expect(tariffService.createTariff(validCreateData())).rejects.toThrow('Location not found');
  });

  it('кидає помилку, якщо локація неактивна', async () => {
    mockValidReferences();
    Location.findByPk.mockResolvedValue({ id: 1, is_active: false });

    await expect(tariffService.createTariff(validCreateData())).rejects.toThrow(
      'Cannot create tariff - location is inactive'
    );
  });

  it('кидає помилку, якщо тип ресурсу неактивний', async () => {
    mockValidReferences();
    EnergyResourceType.findByPk.mockResolvedValue({ id: 2, is_active: false });

    await expect(tariffService.createTariff(validCreateData())).rejects.toThrow(
      'Cannot create tariff - energy resource type is inactive'
    );
  });

  it('кидає помилку, якщо період перетинається з існуючим тарифом', async () => {
    mockValidReferences();
    Tariff.findOne.mockResolvedValue({ id: 9 });

    await expect(tariffService.createTariff(validCreateData())).rejects.toThrow(
      'Overlapping tariff period exists for this resource and location'
    );
    expect(Tariff.create).not.toHaveBeenCalled();
  });

  it('створює тариф, якщо всі перевірки пройдено', async () => {
    mockValidReferences();
    Tariff.create.mockResolvedValue({ id: 10 });

    const result = await tariffService.createTariff(validCreateData());

    expect(result).toEqual({ id: 10 });
    expect(Tariff.create).toHaveBeenCalledWith(validCreateData());
  });

  it('шукає перетин: існуючий починається до кінця нового і закінчується після його початку (або безстроковий)', async () => {
    mockValidReferences();
    Tariff.create.mockResolvedValue({ id: 10 });

    await tariffService.createTariff(validCreateData());

    const { where } = Tariff.findOne.mock.calls[0][0];
    expect(where.location_id).toBe(1);
    expect(where.energy_resource_type_id).toBe(2);
    expect(where.valid_from).toEqual({ [Op.lte]: '2025-12-31' });
    expect(where[Op.or]).toEqual([{ valid_to: { [Op.gte]: '2025-01-01' } }, { valid_to: null }]);
  });

  it('для безстрокового нового тарифу вважає кінцем періоду 9999-12-31', async () => {
    mockValidReferences();
    Tariff.create.mockResolvedValue({ id: 10 });

    await tariffService.createTariff(validCreateData({ valid_to: undefined }));

    const { where } = Tariff.findOne.mock.calls[0][0];
    expect(where.valid_from[Op.lte]).toEqual(FAR_FUTURE);
  });

  it('історичний період перевіряється з урахуванням дати початку безстрокового тарифу', async () => {
    mockValidReferences();
    Tariff.create.mockResolvedValue({ id: 10 });

    // Період цілком у минулому — безстроковий тариф, що почався пізніше, не має вважатися перетином
    await tariffService.createTariff(
      validCreateData({ valid_from: '2024-01-01', valid_to: '2024-12-31' })
    );

    const { where } = Tariff.findOne.mock.calls[0][0];
    // Умова "починається до кінця нового періоду" діє і для безстрокових тарифів
    expect(where.valid_from).toEqual({ [Op.lte]: '2024-12-31' });
    expect(where[Op.or][1]).toEqual({ valid_to: null });
  });

  it('створює тариф з ціною 0', async () => {
    mockValidReferences();
    Tariff.create.mockResolvedValue({ id: 10 });

    await tariffService.createTariff(validCreateData({ price: 0 }));

    expect(Tariff.create).toHaveBeenCalledWith(validCreateData({ price: 0 }));
  });

  it('кидає помилку, якщо ціну не передано', async () => {
    const data = validCreateData();
    delete data.price;

    await expect(tariffService.createTariff(data)).rejects.toThrow(
      'Location, energy resource type, price and valid_from are required'
    );
  });
});

// ═════════════════════════════════════════════
describe('updateTariff', () => {
  it('кидає помилку, якщо тариф не знайдено', async () => {
    Tariff.findByPk.mockResolvedValue(null);

    await expect(tariffService.updateTariff(999, { price: 5 })).rejects.toThrow('Tariff not found');
  });

  it('оновлює тільки ціну без перевірки перетину, якщо дати не змінюються', async () => {
    const tariff = makeTariff();
    Tariff.findByPk.mockResolvedValue(tariff);

    await tariffService.updateTariff(4, { price: 5.1 });

    expect(Tariff.findOne).not.toHaveBeenCalled();
    expect(tariff.update).toHaveBeenCalledWith({ price: 5.1 });
  });

  it('не перевіряє локацію, якщо передано ту саму', async () => {
    Tariff.findByPk.mockResolvedValue(makeTariff({ location_id: 1 }));

    await tariffService.updateTariff(4, { location_id: 1 });

    expect(Location.findByPk).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо нова локація неактивна', async () => {
    Tariff.findByPk.mockResolvedValue(makeTariff());
    Location.findByPk.mockResolvedValue({ id: 3, is_active: false });

    await expect(tariffService.updateTariff(4, { location_id: 3 })).rejects.toThrow(
      'Cannot update tariff - location is inactive'
    );
  });

  it('кидає помилку, якщо новий період перетинається з іншим тарифом', async () => {
    const tariff = makeTariff();
    Tariff.findByPk.mockResolvedValue(tariff);
    Tariff.findOne.mockResolvedValue({ id: 9 });

    await expect(tariffService.updateTariff(4, { valid_from: '2025-02-01' })).rejects.toThrow(
      'Updated period overlaps with existing tariff'
    );
    expect(tariff.update).not.toHaveBeenCalled();
  });

  it('при зміні дат шукає перетин серед ІНШИХ тарифів за тією самою умовою, що й при створенні', async () => {
    const tariff = makeTariff();
    Tariff.findByPk.mockResolvedValue(tariff);
    Tariff.findOne.mockResolvedValue(null);

    await tariffService.updateTariff(4, { valid_from: '2025-02-01', valid_to: '2025-06-30' });

    const { where } = Tariff.findOne.mock.calls[0][0];
    expect(where.id[Op.ne]).toBe(4);
    expect(where.valid_from).toEqual({ [Op.lte]: '2025-06-30' });
    expect(where[Op.or]).toEqual([{ valid_to: { [Op.gte]: '2025-02-01' } }, { valid_to: null }]);
  });

  it('не приймає valid_to, раніший за збережений valid_from', async () => {
    const tariff = makeTariff({ valid_from: '2025-01-01' });
    Tariff.findByPk.mockResolvedValue(tariff);
    Tariff.findOne.mockResolvedValue(null);

    await expect(tariffService.updateTariff(4, { valid_to: '2024-06-01' })).rejects.toThrow(
      'valid_to must be after valid_from'
    );
    expect(tariff.update).not.toHaveBeenCalled();
  });

  it('при зміні лише valid_from перевіряє перетин зі збереженим valid_to', async () => {
    const tariff = makeTariff({ valid_from: '2025-01-01', valid_to: '2025-12-31' });
    Tariff.findByPk.mockResolvedValue(tariff);
    Tariff.findOne.mockResolvedValue(null);

    await tariffService.updateTariff(4, { valid_from: '2025-02-01' });

    const { where } = Tariff.findOne.mock.calls[0][0];
    expect(where.valid_from[Op.lte]).toBe('2025-12-31');
  });

  it('при зміні локації перевіряє перетин зі збереженими датами на новій локації', async () => {
    const tariff = makeTariff({ location_id: 1, valid_from: '2025-01-01', valid_to: null });
    Tariff.findByPk.mockResolvedValue(tariff);
    Location.findByPk.mockResolvedValue({ id: 3, is_active: true });
    Tariff.findOne.mockResolvedValue(null);

    await tariffService.updateTariff(4, { location_id: 3 });

    const { where } = Tariff.findOne.mock.calls[0][0];
    expect(where.location_id).toBe(3);
    expect(where.valid_from[Op.lte]).toEqual(FAR_FUTURE);
    expect(where[Op.or]).toEqual([{ valid_to: { [Op.gte]: '2025-01-01' } }, { valid_to: null }]);
    expect(tariff.update).toHaveBeenCalledWith({ location_id: 3 });
  });

  it('перевіряє перетин, якщо тариф роблять безстроковим (valid_to: null)', async () => {
    const tariff = makeTariff({ valid_from: '2025-01-01', valid_to: '2025-12-31' });
    Tariff.findByPk.mockResolvedValue(tariff);
    Tariff.findOne.mockResolvedValue(null);

    await tariffService.updateTariff(4, { valid_to: null });

    const { where } = Tariff.findOne.mock.calls[0][0];
    expect(where.valid_from[Op.lte]).toEqual(FAR_FUTURE);
    expect(tariff.update).toHaveBeenCalledWith({ valid_to: null });
  });
});

// ═════════════════════════════════════════════
describe('deleteTariff', () => {
  it('кидає помилку, якщо тариф не знайдено', async () => {
    Tariff.findByPk.mockResolvedValue(null);

    await expect(tariffService.deleteTariff(999)).rejects.toThrow('Tariff not found');
  });

  it('видаляє знайдений тариф', async () => {
    const tariff = makeTariff();
    Tariff.findByPk.mockResolvedValue(tariff);

    await tariffService.deleteTariff(4);

    expect(tariff.destroy).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('getApplicableTariff', () => {
  it('кидає помилку, якщо не передано локацію або тип ресурсу', async () => {
    await expect(tariffService.getApplicableTariff(null, 2, '2025-03-15')).rejects.toThrow(
      'Both location_id and energy_resource_type_id are required'
    );
  });

  it('кидає помилку для некоректної дати', async () => {
    await expect(tariffService.getApplicableTariff(1, 2, 'not-a-date')).rejects.toThrow(
      'Invalid reading_date: not-a-date'
    );
  });

  it('шукає тариф, що діяв на вказану дату', async () => {
    const tariff = makeTariff();
    Tariff.findOne.mockResolvedValue(tariff);

    const result = await tariffService.getApplicableTariff(1, 2, '2025-03-15');

    expect(result).toBe(tariff);
    const { where, order } = Tariff.findOne.mock.calls[0][0];
    expect(where.valid_from[Op.lte]).toEqual(new Date('2025-03-15'));
    expect(where[Op.or]).toHaveLength(2);
    expect(order).toEqual([['valid_from', 'DESC']]);
  });

  it('кидає помилку, якщо на дату немає активного тарифу', async () => {
    Tariff.findOne.mockResolvedValue(null);

    await expect(tariffService.getApplicableTariff(1, 2, '2025-03-15')).rejects.toThrow(
      'не налаштовано активний Тариф'
    );
  });
});