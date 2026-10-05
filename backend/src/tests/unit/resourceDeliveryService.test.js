jest.mock('../../../models', () => ({
  ResourceDelivery: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  EnergyResourceType: {
    findByPk: jest.fn(),
  },
  Location: {
    findByPk: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const { ResourceDelivery, EnergyResourceType, Location } = require('../../../models');
const resourceDeliveryService = require('../../services/resourceDeliveryService');

function validCreateData(overrides = {}) {
  return {
    location_id: 1,
    energy_resource_type_id: 2,
    delivery_date: '2025-03-15',
    quantity: 500,
    unit: 'kWh',
    price_per_unit: 4.32,
    total_cost: 2160,
    supplier: 'Lvivenergozbut',
    ...overrides,
  };
}

// "Фейковий" запис поставки з бази
function makeDelivery(overrides = {}) {
  return {
    id: 5,
    location_id: 1,
    energy_resource_type_id: 2,
    delivery_date: '2025-03-15',
    update: jest.fn().mockResolvedValue({ id: 5 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Налаштовує моки так, ніби локація й тип ресурсу існують і активні, а дубліката немає
function mockValidReferences() {
  Location.findByPk.mockResolvedValue({ id: 1, is_active: true });
  EnergyResourceType.findByPk.mockResolvedValue({ id: 2, is_active: true });
  ResourceDelivery.findOne.mockResolvedValue(null);
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('getAllDeliveries', () => {
  it('без фільтрів повертає першу сторінку з 10 записів', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [{ id: 1 }], count: 1 });

    const result = await resourceDeliveryService.getAllDeliveries();

    expect(result).toEqual({ data: [{ id: 1 }], count: 1 });
    const args = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.limit).toBe(10);
    expect(args.offset).toBe(0);
    expect(args.order).toEqual([['delivery_date', 'DESC']]);
  });

  it('застосовує фільтри за локацією, типом ресурсу і датою', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await resourceDeliveryService.getAllDeliveries({
      location_id: 1,
      energy_resource_type_id: 2,
      delivery_date: '2025-03-15',
    });

    const { where } = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(where).toEqual({
      location_id: 1,
      energy_resource_type_id: 2,
      delivery_date: '2025-03-15',
    });
  });

  it('рахує зсув для сторінки: 3-тя сторінка по 20 записів → пропустити 40', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await resourceDeliveryService.getAllDeliveries({ page: 3, limit: 20 });

    const args = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(args.limit).toBe(20);
    expect(args.offset).toBe(40);
  });

  it('перетворює page і limit з рядків (так вони приходять з query)', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await resourceDeliveryService.getAllDeliveries({ page: '2', limit: '5' });

    const args = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(args.limit).toBe(5);
    expect(args.offset).toBe(5);
  });

    it('вважає від’ємну сторінку першою', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await resourceDeliveryService.getAllDeliveries({ page: '-1' });

    const args = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(args.offset).toBe(0);
  });

  it('використовує ліміт за замовчуванням для від’ємного limit', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await resourceDeliveryService.getAllDeliveries({ limit: '-5' });

    const args = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(args.limit).toBe(10);
  });

  it('обмежує limit до 100 записів', async () => {
    ResourceDelivery.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await resourceDeliveryService.getAllDeliveries({ limit: '1000' });

    const args = ResourceDelivery.findAndCountAll.mock.calls[0][0];
    expect(args.limit).toBe(100);
  });
});

// ═════════════════════════════════════════════
describe('getDeliveryById', () => {
  it('повертає знайдену поставку разом із локацією і типом ресурсу', async () => {
    const delivery = makeDelivery();
    ResourceDelivery.findByPk.mockResolvedValue(delivery);

    const result = await resourceDeliveryService.getDeliveryById(5);

    expect(result).toBe(delivery);
    const [id, options] = ResourceDelivery.findByPk.mock.calls[0];
    expect(id).toBe(5);
    expect(options.include).toHaveLength(2);
  });

  it('повертає null, якщо поставку не знайдено (помилку не кидає)', async () => {
    ResourceDelivery.findByPk.mockResolvedValue(null);

    const result = await resourceDeliveryService.getDeliveryById(999);

    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════
describe('createResourceDelivery', () => {
  it('кидає помилку, якщо бракує обов’язкового поля, і не звертається до бази', async () => {
    const data = validCreateData();
    delete data.location_id;

    await expect(resourceDeliveryService.createResourceDelivery(data)).rejects.toThrow(
      'Required fields missing'
    );

    expect(Location.findByPk).not.toHaveBeenCalled();
    expect(ResourceDelivery.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо локацію не знайдено', async () => {
    mockValidReferences();
    Location.findByPk.mockResolvedValue(null);

    await expect(resourceDeliveryService.createResourceDelivery(validCreateData())).rejects.toThrow(
      'Location not found'
    );
    expect(ResourceDelivery.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо локація неактивна', async () => {
    mockValidReferences();
    Location.findByPk.mockResolvedValue({ id: 1, is_active: false });

    await expect(resourceDeliveryService.createResourceDelivery(validCreateData())).rejects.toThrow(
      'Cannot create delivery - location is inactive'
    );
    expect(ResourceDelivery.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо тип ресурсу не знайдено', async () => {
    mockValidReferences();
    EnergyResourceType.findByPk.mockResolvedValue(null);

    await expect(resourceDeliveryService.createResourceDelivery(validCreateData())).rejects.toThrow(
      'Energy resource type not found'
    );
    expect(ResourceDelivery.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо тип ресурсу неактивний', async () => {
    mockValidReferences();
    EnergyResourceType.findByPk.mockResolvedValue({ id: 2, is_active: false });

    await expect(resourceDeliveryService.createResourceDelivery(validCreateData())).rejects.toThrow(
      'Cannot create delivery - energy resource type is inactive'
    );
    expect(ResourceDelivery.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо поставка на цю дату вже існує', async () => {
    mockValidReferences();
    ResourceDelivery.findOne.mockResolvedValue({ id: 99 });

    await expect(resourceDeliveryService.createResourceDelivery(validCreateData())).rejects.toThrow(
      'Delivery for this location, resource type, and date already exists'
    );
    expect(ResourceDelivery.create).not.toHaveBeenCalled();
  });

  it('створює поставку, якщо всі перевірки пройдено', async () => {
    mockValidReferences();
    ResourceDelivery.create.mockResolvedValue({ id: 10 });

    const result = await resourceDeliveryService.createResourceDelivery(validCreateData());

    expect(result).toEqual({ id: 10 });
    expect(ResourceDelivery.create).toHaveBeenCalledWith(validCreateData());
  });

  it('шукає дублікат за локацією, типом ресурсу і датою', async () => {
    mockValidReferences();
    ResourceDelivery.create.mockResolvedValue({ id: 10 });

    await resourceDeliveryService.createResourceDelivery(validCreateData());

    expect(ResourceDelivery.findOne).toHaveBeenCalledWith({
      where: { location_id: 1, energy_resource_type_id: 2, delivery_date: '2025-03-15' },
    });
  });

    it('створює поставку з quantity = 0', async () => {
    mockValidReferences();
    ResourceDelivery.create.mockResolvedValue({ id: 10 });

    await resourceDeliveryService.createResourceDelivery(validCreateData({ quantity: 0 }));

    expect(ResourceDelivery.create).toHaveBeenCalledWith(validCreateData({ quantity: 0 }));
  });

  it('кидає помилку, якщо quantity не передано', async () => {
    const data = validCreateData();
    delete data.quantity;

    await expect(resourceDeliveryService.createResourceDelivery(data)).rejects.toThrow(
      'Required fields missing'
    );
  });
});

// ═════════════════════════════════════════════
describe('updateResourceDelivery', () => {
  it('кидає помилку, якщо поставку не знайдено', async () => {
    ResourceDelivery.findByPk.mockResolvedValue(null);

    await expect(
      resourceDeliveryService.updateResourceDelivery(999, { quantity: 10 })
    ).rejects.toThrow('Delivery not found');
  });

  it('оновлює поля без перевірки дублікатів, якщо ключові поля не змінюються', async () => {
    const delivery = makeDelivery();
    ResourceDelivery.findByPk.mockResolvedValue(delivery);

    await resourceDeliveryService.updateResourceDelivery(5, { quantity: 700 });

    expect(ResourceDelivery.findOne).not.toHaveBeenCalled();
    expect(delivery.update).toHaveBeenCalledWith({ quantity: 700 });
  });

  it('не перевіряє локацію, якщо передано ту саму', async () => {
    const delivery = makeDelivery({ location_id: 1 });
    ResourceDelivery.findByPk.mockResolvedValue(delivery);
    ResourceDelivery.findOne.mockResolvedValue(null);

    await resourceDeliveryService.updateResourceDelivery(5, { location_id: 1 });

    expect(Location.findByPk).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо нову локацію не знайдено', async () => {
    ResourceDelivery.findByPk.mockResolvedValue(makeDelivery());
    Location.findByPk.mockResolvedValue(null);

    await expect(
      resourceDeliveryService.updateResourceDelivery(5, { location_id: 3 })
    ).rejects.toThrow('Location not found');
  });

  it('кидає помилку, якщо нова локація неактивна', async () => {
    ResourceDelivery.findByPk.mockResolvedValue(makeDelivery());
    Location.findByPk.mockResolvedValue({ id: 3, is_active: false });

    await expect(
      resourceDeliveryService.updateResourceDelivery(5, { location_id: 3 })
    ).rejects.toThrow('Cannot update delivery - location is inactive');
  });

  it('кидає помилку, якщо новий тип ресурсу неактивний', async () => {
    ResourceDelivery.findByPk.mockResolvedValue(makeDelivery());
    EnergyResourceType.findByPk.mockResolvedValue({ id: 4, is_active: false });

    await expect(
      resourceDeliveryService.updateResourceDelivery(5, { energy_resource_type_id: 4 })
    ).rejects.toThrow('Cannot update delivery - energy resource type is inactive');
  });

  it('при зміні дати шукає дублікат серед ІНШИХ поставок з поточними локацією і типом', async () => {
    const delivery = makeDelivery();
    ResourceDelivery.findByPk.mockResolvedValue(delivery);
    ResourceDelivery.findOne.mockResolvedValue(null);

    await resourceDeliveryService.updateResourceDelivery(5, { delivery_date: '2025-04-01' });

    const { where } = ResourceDelivery.findOne.mock.calls[0][0];
    expect(where.location_id).toBe(1);
    expect(where.energy_resource_type_id).toBe(2);
    expect(where.delivery_date).toBe('2025-04-01');
    expect(where.id[Op.ne]).toBe(5);
    expect(delivery.update).toHaveBeenCalledWith({ delivery_date: '2025-04-01' });
  });

  it('кидає помилку, якщо після зміни дати виходить дублікат', async () => {
    const delivery = makeDelivery();
    ResourceDelivery.findByPk.mockResolvedValue(delivery);
    ResourceDelivery.findOne.mockResolvedValue({ id: 8 });

    await expect(
      resourceDeliveryService.updateResourceDelivery(5, { delivery_date: '2025-04-01' })
    ).rejects.toThrow('Another delivery for this location, resource type and date already exists');

    expect(delivery.update).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('deleteResourceDelivery', () => {
  it('кидає помилку, якщо поставку не знайдено', async () => {
    ResourceDelivery.findByPk.mockResolvedValue(null);

    await expect(resourceDeliveryService.deleteResourceDelivery(999)).rejects.toThrow(
      'Delivery not found'
    );
  });

  it('видаляє знайдену поставку', async () => {
    const delivery = makeDelivery();
    ResourceDelivery.findByPk.mockResolvedValue(delivery);

    await resourceDeliveryService.deleteResourceDelivery(5);

    expect(delivery.destroy).toHaveBeenCalled();
  });
});