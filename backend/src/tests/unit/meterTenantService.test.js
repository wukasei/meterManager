jest.mock('../../../models', () => ({
  MeterTenant: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Tenant: {
    findByPk: jest.fn(),
  },
  Meter: {
    findByPk: jest.fn(),
  },
  Location: {},
  EnergyResourceType: {},
}));

const { Op } = require('sequelize');
const { MeterTenant, Tenant, Meter } = require('../../../models');
const meterTenantService = require('../../services/meterTenantService');

// ─────────────────────────────────────────────
// Допоміжні функції
// ─────────────────────────────────────────────

function validCreateData(overrides = {}) {
  return {
    tenant_id: 2,
    meter_id: 5,
    assigned_from: '2025-01-01',
    assigned_to: '2025-12-31',
    ...overrides,
  };
}

// "Фейкова" прив'язка з бази
function makeAssignment(overrides = {}) {
  return {
    id: 8,
    tenant_id: 2,
    meter_id: 5,
    assigned_from: '2025-01-01',
    assigned_to: null,
    update: jest.fn().mockResolvedValue({ id: 8 }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Лічильник і орендар існують і активні
function mockActiveReferences() {
  Meter.findByPk.mockResolvedValue({ id: 5, is_active: true });
  Tenant.findByPk.mockResolvedValue({ id: 2, is_active: true });
}

beforeEach(() => {
  jest.resetAllMocks();
});

// ═════════════════════════════════════════════
describe('getAllMeterTenants', () => {
  it('без фільтрів повертає всі прив’язки, новіші першими', async () => {
    MeterTenant.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await meterTenantService.getAllMeterTenants();

    expect(result).toEqual([{ id: 1 }]);
    const args = MeterTenant.findAll.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.order).toEqual([['assigned_from', 'DESC']]);
  });

  it('фільтрує за орендарем і лічильником', async () => {
    MeterTenant.findAll.mockResolvedValue([]);

    await meterTenantService.getAllMeterTenants({ tenant_id: 2, meter_id: 5 });

    const { where } = MeterTenant.findAll.mock.calls[0][0];
    expect(where.tenant_id).toBe(2);
    expect(where.meter_id).toBe(5);
  });

  it('фільтр за періодом шукає прив’язки, що перетинаються з ним', async () => {
    MeterTenant.findAll.mockResolvedValue([]);

    await meterTenantService.getAllMeterTenants({
      assigned_from: '2025-01-01',
      assigned_to: '2025-06-30',
    });

    const { where } = MeterTenant.findAll.mock.calls[0][0];
    expect(where.assigned_from[Op.lte]).toBe('2025-06-30');
    expect(where[Op.or]).toEqual([
      { assigned_to: null },
      { assigned_to: { [Op.gte]: '2025-01-01' } },
    ]);
  });

  it('якщо кінець періоду не вказано, бере сьогоднішню дату', async () => {
    MeterTenant.findAll.mockResolvedValue([]);

    await meterTenantService.getAllMeterTenants({ assigned_from: '2025-01-01' });

    const { where } = MeterTenant.findAll.mock.calls[0][0];
    expect(where.assigned_from[Op.lte]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ═════════════════════════════════════════════
describe('getMeterTenantById', () => {
  it('повертає знайдену прив’язку', async () => {
    const assignment = makeAssignment();
    MeterTenant.findByPk.mockResolvedValue(assignment);

    const result = await meterTenantService.getMeterTenantById(8);

    expect(result).toBe(assignment);
  });

  it('кидає помилку, якщо прив’язку не знайдено', async () => {
    MeterTenant.findByPk.mockResolvedValue(null);

    await expect(meterTenantService.getMeterTenantById(999)).rejects.toThrow(
      'MeterTenant not found'
    );
  });
});

// ═════════════════════════════════════════════
describe('checkOverlap', () => {
  it('шукає прив’язку того ж орендаря і лічильника, що перетинається з періодом', async () => {
    MeterTenant.findOne.mockResolvedValue(null);

    await meterTenantService.checkOverlap(2, 5, '2025-01-01', '2025-12-31');

    const { where } = MeterTenant.findOne.mock.calls[0][0];
    expect(where.tenant_id).toBe(2);
    expect(where.meter_id).toBe(5);
    expect(where.assigned_from[Op.lte]).toBe('2025-12-31');
    expect(where[Op.or]).toEqual([
      { assigned_to: null },
      { assigned_to: { [Op.gte]: '2025-01-01' } },
    ]);
    expect(where.id).toBeUndefined();
  });

  it('для безстрокового періоду вважає кінцем 2099-12-31', async () => {
    MeterTenant.findOne.mockResolvedValue(null);

    await meterTenantService.checkOverlap(2, 5, '2025-01-01', null);

    const { where } = MeterTenant.findOne.mock.calls[0][0];
    expect(where.assigned_from[Op.lte]).toBe('2099-12-31');
  });

  it('не враховує саму прив’язку, якщо передано excludeId', async () => {
    MeterTenant.findOne.mockResolvedValue(null);

    await meterTenantService.checkOverlap(2, 5, '2025-01-01', null, 8);

    const { where } = MeterTenant.findOne.mock.calls[0][0];
    expect(where.id[Op.ne]).toBe(8);
  });
});

// ═════════════════════════════════════════════
describe('createMeterTenant', () => {
  it('кидає помилку, якщо бракує обов’язкового поля', async () => {
    const data = validCreateData();
    delete data.assigned_from;

    await expect(meterTenantService.createMeterTenant(data)).rejects.toThrow(
      'tenant_id, meter_id, and assigned_from are required'
    );
  });

  it('кидає помилку, якщо дата початку пізніша за дату завершення', async () => {
    await expect(
      meterTenantService.createMeterTenant(
        validCreateData({ assigned_from: '2025-06-01', assigned_to: '2025-01-01' })
      )
    ).rejects.toThrow('assigned_from cannot be later than assigned_to');
    expect(MeterTenant.create).not.toHaveBeenCalled();
  });

  it('дозволяє прив’язку на один день (дата початку дорівнює даті завершення)', async () => {
    mockActiveReferences();
    MeterTenant.findOne.mockResolvedValue(null);
    MeterTenant.create.mockResolvedValue({ id: 10 });

    await meterTenantService.createMeterTenant(
      validCreateData({ assigned_from: '2025-06-01', assigned_to: '2025-06-01' })
    );

    expect(MeterTenant.create).toHaveBeenCalled();
  });

  it('кидає помилку, якщо період перетинається з існуючою прив’язкою', async () => {
    mockActiveReferences();
    MeterTenant.findOne.mockResolvedValue({ id: 9 });

    await expect(meterTenantService.createMeterTenant(validCreateData())).rejects.toThrow(
      'This meter is already assigned to the tenant for the given period'
    );
    expect(MeterTenant.create).not.toHaveBeenCalled();
  });

  it('створює безстрокову прив’язку, якщо дату завершення не передано', async () => {
    mockActiveReferences();
    MeterTenant.findOne.mockResolvedValue(null);
    MeterTenant.create.mockResolvedValue({ id: 10 });

    await meterTenantService.createMeterTenant(validCreateData({ assigned_to: undefined }));

    expect(MeterTenant.create).toHaveBeenCalledWith({
      tenant_id: 2,
      meter_id: 5,
      assigned_from: '2025-01-01',
      assigned_to: null,
    });
  });

  it('кидає помилку, якщо лічильник не знайдено', async () => {
    mockActiveReferences();
    Meter.findByPk.mockResolvedValue(null);

    await expect(meterTenantService.createMeterTenant(validCreateData())).rejects.toThrow(
      'Meter not found'
    );
    expect(MeterTenant.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо лічильник неактивний', async () => {
    mockActiveReferences();
    Meter.findByPk.mockResolvedValue({ id: 5, is_active: false });

    await expect(meterTenantService.createMeterTenant(validCreateData())).rejects.toThrow(
      'Cannot assign inactive meter'
    );
    expect(MeterTenant.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо орендаря не знайдено', async () => {
    mockActiveReferences();
    Tenant.findByPk.mockResolvedValue(null);

    await expect(meterTenantService.createMeterTenant(validCreateData())).rejects.toThrow(
      'Tenant not found'
    );
    expect(MeterTenant.create).not.toHaveBeenCalled();
  });

  it('кидає помилку, якщо орендар неактивний', async () => {
    mockActiveReferences();
    Tenant.findByPk.mockResolvedValue({ id: 2, is_active: false });

    await expect(meterTenantService.createMeterTenant(validCreateData())).rejects.toThrow(
      'Cannot assign to inactive tenant'
    );
    expect(MeterTenant.create).not.toHaveBeenCalled();
  });

  // Характеризаційний тест (ПИТАННЯ, а не обов'язково вада): перетин шукається лише серед
  // прив'язок ТОГО САМОГО орендаря. Тобто один лічильник можна одночасно прив'язати
  // до двох різних орендарів
  it('[поточна поведінка] перетин перевіряється лише для того самого орендаря', async () => {
    mockActiveReferences();
    MeterTenant.findOne.mockResolvedValue(null);
    MeterTenant.create.mockResolvedValue({ id: 10 });

    await meterTenantService.createMeterTenant(validCreateData({ tenant_id: 3 }));

    const { where } = MeterTenant.findOne.mock.calls[0][0];
    expect(where.tenant_id).toBe(3);
  });
});

// ═════════════════════════════════════════════
describe('updateMeterTenant', () => {
  it('кидає помилку, якщо прив’язку не знайдено', async () => {
    MeterTenant.findByPk.mockResolvedValue(null);

    await expect(
      meterTenantService.updateMeterTenant(999, { assigned_to: '2025-06-30' })
    ).rejects.toThrow('MeterTenant not found');
  });

  it('оновлює тільки передані поля', async () => {
    const assignment = makeAssignment();
    MeterTenant.findByPk.mockResolvedValue(assignment);
    MeterTenant.findOne.mockResolvedValue(null);

    await meterTenantService.updateMeterTenant(8, { assigned_to: '2025-06-30' });

    expect(assignment.update).toHaveBeenCalledWith({ assigned_to: '2025-06-30' });
  });

  it('перевіряє перетин для підсумкового періоду, без урахування самої прив’язки', async () => {
    MeterTenant.findByPk.mockResolvedValue(makeAssignment({ assigned_from: '2025-01-01' }));
    MeterTenant.findOne.mockResolvedValue(null);

    await meterTenantService.updateMeterTenant(8, { assigned_to: '2025-06-30' });

    const { where } = MeterTenant.findOne.mock.calls[0][0];
    expect(where.tenant_id).toBe(2);
    expect(where.meter_id).toBe(5);
    expect(where.assigned_from[Op.lte]).toBe('2025-06-30');
    expect(where[Op.or][1]).toEqual({ assigned_to: { [Op.gte]: '2025-01-01' } });
    expect(where.id[Op.ne]).toBe(8);
  });

  // Вада, відкладена з meterValidation (req.originalAssignedFrom), тут уже закрита:
  // нову дату завершення порівнюють з датою початку, збереженою в базі
  it('не приймає дату завершення, ранішу за збережену дату початку', async () => {
    const assignment = makeAssignment({ assigned_from: '2025-01-01' });
    MeterTenant.findByPk.mockResolvedValue(assignment);

    await expect(
      meterTenantService.updateMeterTenant(8, { assigned_to: '2024-06-01' })
    ).rejects.toThrow('assigned_from cannot be later than assigned_to');
    expect(assignment.update).not.toHaveBeenCalled();
  });

  it('при перетині кидає помилку зі статусом 409 і датою конфліктної прив’язки', async () => {
    const assignment = makeAssignment();
    MeterTenant.findByPk.mockResolvedValue(assignment);
    MeterTenant.findOne.mockResolvedValue({ id: 9, assigned_from: '2025-03-01' });

    const error = await meterTenantService
      .updateMeterTenant(8, { assigned_to: '2025-06-30' })
      .catch((e) => e);

    expect(error.message).toBe('Assignment conflict: overlapping period');
    expect(error.status).toBe(409);
    expect(error.errors[0].msg).toContain('2025-03-01');
    expect(assignment.update).not.toHaveBeenCalled();
  });

  it('не дозволяє змінити орендаря на неактивного', async () => {
    const assignment = makeAssignment();
    MeterTenant.findByPk.mockResolvedValue(assignment);
    Tenant.findByPk.mockResolvedValue({ id: 3, is_active: false });

    await expect(meterTenantService.updateMeterTenant(8, { tenant_id: 3 })).rejects.toThrow(
      'Cannot assign to inactive tenant'
    );
    expect(assignment.update).not.toHaveBeenCalled();
  });

  it('змінює орендаря на активного після перевірки', async () => {
    const assignment = makeAssignment();
    MeterTenant.findByPk.mockResolvedValue(assignment);
    Tenant.findByPk.mockResolvedValue({ id: 3, is_active: true });
    MeterTenant.findOne.mockResolvedValue(null);

    await meterTenantService.updateMeterTenant(8, { tenant_id: 3 });

    expect(Tenant.findByPk).toHaveBeenCalledWith(3);
    expect(assignment.update).toHaveBeenCalledWith({ tenant_id: 3 });
  });
});

// ═════════════════════════════════════════════
describe('deleteMeterTenant', () => {
  it('кидає помилку, якщо прив’язку не знайдено', async () => {
    MeterTenant.findByPk.mockResolvedValue(null);

    await expect(meterTenantService.deleteMeterTenant(999)).rejects.toThrow(
      'MeterTenant not found'
    );
  });

  it('видаляє знайдену прив’язку', async () => {
    const assignment = makeAssignment();
    MeterTenant.findByPk.mockResolvedValue(assignment);

    await meterTenantService.deleteMeterTenant(8);

    expect(assignment.destroy).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════
describe('getActiveMeterAssignments', () => {
  it('шукає прив’язки лічильника, чинні на вказану дату', async () => {
    MeterTenant.findAll.mockResolvedValue([]);
    const date = new Date('2025-03-15');

    await meterTenantService.getActiveMeterAssignments(5, date);

    const { where } = MeterTenant.findAll.mock.calls[0][0];
    expect(where.meter_id).toBe(5);
    expect(where.assigned_from[Op.lte]).toBe(date);
    expect(where[Op.or]).toEqual([{ assigned_to: null }, { assigned_to: { [Op.gte]: date } }]);
  });
});

// ═════════════════════════════════════════════
describe('getTenantMeterHistory', () => {
  it('повертає всі прив’язки орендаря, новіші першими', async () => {
    MeterTenant.findAll.mockResolvedValue([]);

    await meterTenantService.getTenantMeterHistory(2);

    const args = MeterTenant.findAll.mock.calls[0][0];
    expect(args.where).toEqual({ tenant_id: 2 });
    expect(args.order).toEqual([['assigned_from', 'DESC']]);
  });
});