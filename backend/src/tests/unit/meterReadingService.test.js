jest.mock('../../../models', () => ({
  MeterReading: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  MeterTenant: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  MeterReadingDistribution: {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  },
  Location: {
    findAll: jest.fn(),
  },
  Meter: {},
  Tenant: {},
  User: {},
  EnergyResourceType: {},
  sequelize: {
    transaction: jest.fn(),
  },
}));

// tariffService мокаємо: тарифи тут не тестуємо, нам потрібна лише ціна
jest.mock('../../services/tariffService', () => ({
  getApplicableTariff: jest.fn(),
}));

const { Op } = require('sequelize');
const {
  MeterReading,
  MeterTenant,
  MeterReadingDistribution,
  Location,
  sequelize,
} = require('../../../models');
const tariffService = require('../../services/tariffService');
const meterReadingService = require('../../services/meterReadingService');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

// Прив'язка лічильника до орендаря разом із лічильником і локацією.
// occupied_area = '100' обрано навмисно: тоді area/100 = 1 і не впливає на результат
function makeMeterTenant(occupiedArea = '100') {
  return {
    id: 3,
    Meter: {
      location_id: 1,
      energy_resource_type_id: 2,
      Location: { occupied_area: occupiedArea },
    },
  };
}

function validCreateData(overrides = {}) {
  return {
    meter_tenant_id: 3,
    reading_date: '2025-03-15',
    current_reading: 150,
    previous_reading: 100,
    calculation_method: 'direct',
    created_by: 1,
    ...overrides,
  };
}

// "Фейкове" показання з бази
function makeReading(overrides = {}) {
  return {
    id: 77,
    meter_tenant_id: 3,
    reading_date: '2025-03-15',
    current_reading: '150',
    previous_reading: '100',
    calculation_method: 'direct',
    calculation_coefficient: 1,
    energy_consumption_coefficient: 1,
    update: jest.fn().mockResolvedValue({ id: 77 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

let transaction;

beforeEach(() => {
  jest.resetAllMocks();

  transaction = { commit: jest.fn(), rollback: jest.fn() };
  sequelize.transaction.mockResolvedValue(transaction);

  // За замовчуванням: тариф 4 грн за одиницю, локація площею 100
  tariffService.getApplicableTariff.mockResolvedValue({ price: 4 });
  MeterTenant.findByPk.mockResolvedValue(makeMeterTenant());
  MeterReading.create.mockResolvedValue({ id: 77 });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ═════════════════════════════════════════════
describe('getAllLocations', () => {
  it('повертає локації з площею, відсортовані за назвою', async () => {
    Location.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await meterReadingService.getAllLocations();

    expect(result).toEqual([{ id: 1 }]);
    expect(Location.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'name', 'address', 'occupied_area'],
      order: [['name', 'ASC']],
    });
  });
});

// ═════════════════════════════════════════════
describe('getAllReadings', () => {
  it('застосовує фільтри', async () => {
    MeterReading.findAll.mockResolvedValue([]);
    MeterTenant.findAll.mockResolvedValue([]);

    await meterReadingService.getAllReadings({
      meter_tenant_id: 3,
      executor_name: 'ivan',
      calculation_method: 'direct',
    });

    const { where } = MeterReading.findAll.mock.calls[0][0];
    expect(where.meter_tenant_id).toBe(3);
    expect(where.executor_name[Op.iLike]).toBe('%ivan%');
    expect(where.calculation_method).toBe('direct');
  });

  it('рахує частку площі локації від загальної орендованої площі (без дублікатів локацій)', async () => {
    const plain = {
      id: 1,
      MeterTenant: { Meter: { Location: { occupied_area: '100', address: 'Main st. 1', name: 'Office A' } } },
    };
    MeterReading.findAll.mockResolvedValue([{ ...plain, get: () => plain }]);
    // Локація 1 зустрічається двічі — має врахуватися один раз: 100 + 300 = 400
    MeterTenant.findAll.mockResolvedValue([
      { 'Meter.Location.id': 1, 'Meter.Location.occupied_area': '100' },
      { 'Meter.Location.id': 1, 'Meter.Location.occupied_area': '100' },
      { 'Meter.Location.id': 2, 'Meter.Location.occupied_area': '300' },
    ]);

    const [result] = await meterReadingService.getAllReadings();

    expect(result.total_rented_area).toBe(400);
    expect(result.area_percentage).toBe(25);
    expect(result.address).toBe('Main st. 1');
    expect(result.location_name).toBe('Office A');
  });
});

// ═════════════════════════════════════════════
describe('getReadingById', () => {
  it('повертає знайдене показання', async () => {
    const reading = makeReading();
    MeterReading.findByPk.mockResolvedValue(reading);

    const result = await meterReadingService.getReadingById(77);

    expect(result).toBe(reading);
  });

  it('кидає помилку, якщо показання не знайдено', async () => {
    MeterReading.findByPk.mockResolvedValue(null);

    await expect(meterReadingService.getReadingById(999)).rejects.toThrow(
      'Meter reading not found'
    );
  });
});

// ═════════════════════════════════════════════
describe('createReading', () => {
  it('рахує споживання і вартість з переданим попереднім показанням', async () => {
    await meterReadingService.createReading(validCreateData());

    // 150 - 100 = 50; прямий метод, коефіцієнт 1, площа 100 → 50; 50 × 4 = 200
    expect(MeterReading.create).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_reading: 100,
        consumption: 50,
        unit_price: 4,
        direct_consumption: 50,
        area_based_consumption: 0,
        total_consumption: 50,
        total_cost: '200.00',
      }),
      { transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('якщо попереднє показання не передано, бере останнє показання до цієї дати', async () => {
    MeterReading.findOne.mockResolvedValue({ current_reading: '120' });

    await meterReadingService.createReading(validCreateData({ previous_reading: undefined }));

    const { where } = MeterReading.findOne.mock.calls[0][0];
    expect(where.meter_tenant_id).toBe(3);
    expect(where.reading_date[Op.lt]).toEqual(new Date('2025-03-15'));
    expect(MeterReading.create.mock.calls[0][0].consumption).toBe(30);
  });

  it('для першого показання вважає попереднє рівним 0', async () => {
    MeterReading.findOne.mockResolvedValue(null);

    await meterReadingService.createReading(validCreateData({ previous_reading: undefined }));

    expect(MeterReading.create.mock.calls[0][0].previous_reading).toBe(0);
    expect(MeterReading.create.mock.calls[0][0].consumption).toBe(150);
  });

  it('не створює показання, менше за попереднє', async () => {
    await expect(
      meterReadingService.createReading(validCreateData({ current_reading: 90 }))
    ).rejects.toThrow('consumption cannot be negative');
    expect(MeterReading.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо прив’язку лічильника не знайдено', async () => {
    MeterTenant.findByPk.mockResolvedValue(null);

    await expect(meterReadingService.createReading(validCreateData())).rejects.toThrow(
      'Meter tenant not found'
    );
  });

  it('кидає помилку для невідомого методу розрахунку', async () => {
    await expect(
      meterReadingService.createReading(validCreateData({ calculation_method: 'magic' }))
    ).rejects.toThrow('Unknown calculation method');
  });

  it('прокидає помилку, якщо на дату немає тарифу', async () => {
    tariffService.getApplicableTariff.mockRejectedValue(new Error('no tariff'));

    await expect(meterReadingService.createReading(validCreateData())).rejects.toThrow('no tariff');
    expect(MeterReading.create).not.toHaveBeenCalled();
  });

  it('з категоріями рахує вартість як суму категорій і зберігає їх у тій самій транзакції', async () => {
    await meterReadingService.createReading(
      validCreateData({
        distributions: [
          { category: 'Office', current_reading: 50, previous_reading: 20 }, // 30 × 4 = 120
          { category: 'Storage', current_reading: 10, previous_reading: 0 }, // 10 × 4 = 40
        ],
      })
    );

    expect(MeterReading.create.mock.calls[0][0].total_cost).toBe('160.00');
    const [records, options] = MeterReadingDistribution.bulkCreate.mock.calls[0];
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual(
      expect.objectContaining({
        category: 'Office',
        difference: 30,
        consumed_energy: '30.00',
        cost: '120.00',
        meter_reading_id: 77,
      })
    );
    expect(options).toEqual({ transaction });
  });

  // ─── Розрахунок з площею ───
  // ConsumptionCalculator очікує ВІДСОТОК (ділить на 100), а сервіс передає площу локації в м²

  it('[поточна поведінка] прямий метод множить споживання на площу/100', async () => {
    MeterTenant.findByPk.mockResolvedValue(makeMeterTenant('150'));

    await meterReadingService.createReading(validCreateData());

    // Споживання 50, але через площу 150 м² стає 50 × 1.5 = 75
    expect(MeterReading.create.mock.calls[0][0].total_consumption).toBe(75);
  });

  it('[поточна поведінка] метод "за площею" множить площу саму на себе', async () => {
    MeterTenant.findByPk.mockResolvedValue(makeMeterTenant('150'));

    await meterReadingService.createReading(
      validCreateData({ calculation_method: 'area_based', energy_consumption_coefficient: 2 })
    );

    // 150 (площа) × 2 (коефіцієнт) × 150/100 (площа ще раз, як "відсоток") = 450
    expect(MeterReading.create.mock.calls[0][0].total_consumption).toBe(450);
  });

  it('[поточна поведінка] переданий відсоток площі total_rented_area_percentage ігнорується', async () => {
    await meterReadingService.createReading(validCreateData({ total_rented_area_percentage: 50 }));

    // Якби 50% враховувались, вийшло б 25, а не 50
    expect(MeterReading.create.mock.calls[0][0].total_consumption).toBe(50);
  });

  it('якщо збереження категорій падає, створення показання відкочується', async () => {
    MeterReadingDistribution.bulkCreate.mockRejectedValue(new Error('DB error'));

    await expect(
      meterReadingService.createReading(
        validCreateData({ distributions: [{ category: 'Office', current_reading: 50, previous_reading: 20 }] })
      )
    ).rejects.toThrow('DB error');

    expect(MeterReading.create).toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('updateReading', () => {
  it('кидає помилку, якщо показання не знайдено', async () => {
    MeterReading.findByPk.mockResolvedValue(null);

    await expect(meterReadingService.updateReading(999, { notes: 'x' })).rejects.toThrow(
      'Meter reading not found'
    );
  });

  it('без зміни полів розрахунку просто оновлює дані, нічого не перераховуючи', async () => {
    const reading = makeReading();
    MeterReading.findByPk.mockResolvedValue(reading);

    await meterReadingService.updateReading(77, { notes: 'Checked' });

    expect(tariffService.getApplicableTariff).not.toHaveBeenCalled();
    expect(reading.update).toHaveBeenCalledWith({ notes: 'Checked' }, { transaction });
  });

  it('при зміні показання перераховує споживання і вартість', async () => {
    const reading = makeReading();
    MeterReading.findByPk.mockResolvedValue(reading);

    await meterReadingService.updateReading(77, { current_reading: 180 });

    // 180 - 100 = 80; 80 × 4 = 320
    expect(reading.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_reading: 180,
        previous_reading: '100',
        consumption: 80,
        unit_price: 4,
        total_consumption: 80,
        total_cost: '320.00',
      }),
      { transaction }
    );
  });

  it('при зміні методу перераховує за новим методом', async () => {
    const reading = makeReading({ calculation_method: 'direct' });
    MeterReading.findByPk.mockResolvedValue(reading);

    await meterReadingService.updateReading(77, {
      current_reading: 180,
      calculation_method: 'area_based',
    });

    // За площею: площа 100 × коефіцієнт 1 × 100/100 = 100; 100 × 4 = 400
    expect(reading.update).toHaveBeenCalledWith(
      expect.objectContaining({
        calculation_method: 'area_based',
        direct_consumption: 0,
        area_based_consumption: 100,
        total_consumption: 100,
        total_cost: '400.00',
      }),
      { transaction }
    );
  });

  it('зміна лише методу теж запускає перерахунок', async () => {
    const reading = makeReading({ calculation_method: 'direct' });
    MeterReading.findByPk.mockResolvedValue(reading);

    await meterReadingService.updateReading(77, { calculation_method: 'area_based' });

    expect(tariffService.getApplicableTariff).toHaveBeenCalled();
    expect(reading.update).toHaveBeenCalledWith(
      expect.objectContaining({
        calculation_method: 'area_based',
        total_consumption: 100,
      }),
      { transaction }
    );
  });

  it('якщо збереження нових категорій падає, видалення старих відкочується', async () => {
    const reading = makeReading();
    MeterReading.findByPk.mockResolvedValue(reading);
    MeterReadingDistribution.bulkCreate.mockRejectedValue(new Error('DB error'));

    await expect(
      meterReadingService.updateReading(77, {
        distributions: [{ category: 'Office', current_reading: 50, previous_reading: 20 }],
      })
    ).rejects.toThrow('DB error');

    expect(MeterReadingDistribution.destroy).toHaveBeenCalledWith({
      where: { meter_reading_id: 77 },
      transaction,
    });
    expect(reading.update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('deleteReading', () => {
  it('кидає помилку, якщо показання не знайдено', async () => {
    MeterReading.findByPk.mockResolvedValue(null);

    await expect(meterReadingService.deleteReading(999)).rejects.toThrow('Meter reading not found');
  });

  it('видаляє знайдене показання', async () => {
    const reading = makeReading();
    MeterReading.findByPk.mockResolvedValue(reading);

    await meterReadingService.deleteReading(77);

    expect(reading.destroy).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('getReadingsSummary', () => {
  function makeSummaryReading(resourceName, consumption, cost) {
    return {
      MeterTenant: {
        Meter: { serial_number: 'SN-1', EnergyResourceType: resourceName ? { name: resourceName } : null },
        Tenant: { name: 'Tenant LLC' },
      },
      reading_date: '2025-03-15',
      total_consumption: consumption,
      total_cost: cost,
    };
  }

  it('групує показання за типом ресурсу і сумує споживання та вартість', async () => {
    MeterReading.findAll.mockResolvedValue([
      makeSummaryReading('Electricity', '50', '200.00'),
      makeSummaryReading('Electricity', '30', '120.00'),
      makeSummaryReading('Gas', '10', '40.00'),
    ]);

    const summary = await meterReadingService.getReadingsSummary();

    expect(summary.Electricity.totalConsumption).toBe(80);
    expect(summary.Electricity.totalCost).toBe(320);
    expect(summary.Electricity.readings).toHaveLength(2);
    expect(summary.Gas.totalConsumption).toBe(10);
  });

  it('показання без типу ресурсу потрапляють у групу "Unknown"', async () => {
    MeterReading.findAll.mockResolvedValue([makeSummaryReading(null, '5', '20.00')]);

    const summary = await meterReadingService.getReadingsSummary();

    expect(summary.Unknown.totalConsumption).toBe(5);
  });

  it('фільтрує за локацією і періодом', async () => {
    MeterReading.findAll.mockResolvedValue([]);

    await meterReadingService.getReadingsSummary({
      location_id: 1,
      date_from: '2025-01-01',
      date_to: '2025-03-31',
    });

    const { where } = MeterReading.findAll.mock.calls[0][0];
    expect(where['$MeterTenant.Meter.location_id$']).toBe(1);
    expect(where.reading_date[Op.between]).toEqual(['2025-01-01', '2025-03-31']);
  });
});