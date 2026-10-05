const { MeterTenant, Tenant, Meter, Location, EnergyResourceType } = require('../../models');
const { Op } = require('sequelize');

// Лічильник має існувати і бути активним, щоб його можна було прив'язати
async function ensureAssignableMeter(meterId) {
  const meter = await Meter.findByPk(meterId);
  if (!meter) throw new Error('Meter not found');
  if (!meter.is_active) throw new Error('Cannot assign inactive meter');
}

// Орендар має існувати і бути активним
async function ensureAssignableTenant(tenantId) {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) throw new Error('Tenant not found');
  if (!tenant.is_active) throw new Error('Cannot assign to inactive tenant');
}

// Які пов'язані дані підтягувати разом із прив'язкою
const TENANT_INCLUDE = {
  model: Tenant,
  as: 'Tenant',
  attributes: ['id', 'name', 'phone', 'email'],
};

const METER_INCLUDE = {
  model: Meter,
  as: 'Meter',
  attributes: ['id', 'serial_number', 'energy_resource_type_id', 'location_id'],
  include: [
    { model: EnergyResourceType, as: 'EnergyResourceType', attributes: ['id', 'name'] },
    { model: Location, as: 'Location', attributes: ['id', 'name', 'address'] },
  ],
};

class MeterTenantService {
  async getAllMeterTenants(filters = {}) {
    const where = {};

    if (filters.tenant_id) {
      where.tenant_id = filters.tenant_id;
    }

    if (filters.meter_id) {
      where.meter_id = filters.meter_id;
    }

    if (filters.assigned_from || filters.assigned_to) {
      const from = filters.assigned_from || '1900-01-01';
      const to = filters.assigned_to || new Date().toISOString().split('T')[0];

      where.assigned_from = { [Op.lte]: to };
      where[Op.or] = [{ assigned_to: null }, { assigned_to: { [Op.gte]: from } }];
    }

    return await MeterTenant.findAll({
      where,
      include: [TENANT_INCLUDE, METER_INCLUDE],
      order: [['assigned_from', 'DESC']],
    });
  }

  async getMeterTenantById(id) {
    const meterTenant = await MeterTenant.findByPk(id, {
      include: [TENANT_INCLUDE, METER_INCLUDE],
    });

    if (!meterTenant) {
      throw new Error('MeterTenant not found');
    }
    return meterTenant;
  }

  async checkOverlap(tenant_id, meter_id, assigned_from, assigned_to, excludeId = null) {
    const maxDate = '2099-12-31';
    const endDate = assigned_to || maxDate;

    const where = {
      tenant_id,
      meter_id,
      assigned_from: { [Op.lte]: endDate },
      [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: assigned_from } }],
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return await MeterTenant.findOne({ where });
  }

  async createMeterTenant(data) {
    const { tenant_id, meter_id, assigned_from, assigned_to } = data;

    if (!tenant_id || !meter_id || !assigned_from) {
      throw new Error('tenant_id, meter_id, and assigned_from are required');
    }

    if (assigned_to && new Date(assigned_from) > new Date(assigned_to)) {
      throw new Error('assigned_from cannot be later than assigned_to');
    }

    await ensureAssignableMeter(meter_id);
    await ensureAssignableTenant(tenant_id);

    const existing = await this.checkOverlap(tenant_id, meter_id, assigned_from, assigned_to);

    if (existing) {
      throw new Error('This meter is already assigned to the tenant for the given period');
    }

    return await MeterTenant.create({
      tenant_id,
      meter_id,
      assigned_from,
      assigned_to: assigned_to || null,
    });
  }

  async updateMeterTenant(id, updateData) {
    const meterTenant = await this.getMeterTenantById(id);

    const updates = {};

    if (updateData.tenant_id !== undefined) {
      updates.tenant_id = updateData.tenant_id;
    }
    if (updateData.meter_id !== undefined) {
      updates.meter_id = updateData.meter_id;
    }
    if (updateData.assigned_from !== undefined) {
      updates.assigned_from = updateData.assigned_from;
    }
    if (updateData.assigned_to !== undefined) {
      updates.assigned_to = updateData.assigned_to;
    }

    // Перевіряємо лічильник і орендаря лише тоді, коли їх змінюють
    if (updates.meter_id !== undefined && updates.meter_id !== meterTenant.meter_id) {
      await ensureAssignableMeter(updates.meter_id);
    }
    if (updates.tenant_id !== undefined && updates.tenant_id !== meterTenant.tenant_id) {
      await ensureAssignableTenant(updates.tenant_id);
    }

    const tenant_id = updates.tenant_id ?? meterTenant.tenant_id;
    const meter_id = updates.meter_id ?? meterTenant.meter_id;
    const assigned_from = updates.assigned_from ?? meterTenant.assigned_from;
    const assigned_to = updates.assigned_to !== undefined ? updates.assigned_to : meterTenant.assigned_to;

    if (assigned_to && new Date(assigned_from) > new Date(assigned_to)) {
      throw new Error('assigned_from cannot be later than assigned_to');
    }

    const existing = await this.checkOverlap(tenant_id, meter_id, assigned_from, assigned_to, id);
    if (existing) {
      const error = new Error('Assignment conflict: overlapping period');

      error.status = 409;
      error.errors = [
        {
          path:'meter_id',
          msg:`Overlaps with existing assignment from ${existing.assigned_from}`
        }
      ] 
      throw error;
    }    

    return await meterTenant.update(updates);
  }

  async deleteMeterTenant(id) {
    const meterTenant = await this.getMeterTenantById(id);
    return await meterTenant.destroy();
  }

  async getActiveMeterAssignments(meter_id, date = new Date()) {
    return await MeterTenant.findAll({
      where: {
        meter_id,
        assigned_from: { [Op.lte]: date },
        [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: date } }],
      },
      include: [TENANT_INCLUDE],
    });
  }

  async getTenantMeterHistory(tenant_id) {
    return await MeterTenant.findAll({
      where: { tenant_id },
      include: [METER_INCLUDE],
      order: [['assigned_from', 'DESC']],
    });
  }
}

module.exports = new MeterTenantService();
