const { Meter, MeterTenant, Tenant, Location, EnergyResourceType, sequelize } = require('../../models');
const { Op } = require('sequelize');

class MeterService {
  async getAllMeters(filters = {}) {
    const where = {};
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.serial_number) where.serial_number = { [Op.iLike]: `%${filters.serial_number}%` };
    if (filters.location_id) where.location_id = filters.location_id;
    if (filters.energy_resource_type_id) where.energy_resource_type_id = filters.energy_resource_type_id;

    return await Meter.findAll({
      where,
      include: [
        { model: Location, as: 'Location' },
        { model: EnergyResourceType, as: 'EnergyResourceType' },
        { model: MeterTenant, as: 'MeterTenants' },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async getMeterById(id) {
    const meter = await Meter.findByPk(id, {
      include: [
        { model: Location, as: 'Location' },
        { model: EnergyResourceType, as: 'EnergyResourceType' },
        { model: MeterTenant, as: 'MeterTenants', include: [{ model: Tenant, as: 'Tenant' }] },
      ],
    });
    if (!meter) throw new Error('Meter not found');
    return meter;
  }

  async getMeterDependencies(id) {
    const activeMeterTenants = await MeterTenant.count({
      where: { meter_id: id, [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: new Date() } }] },
    });

    return {
      active_meter_tenants: activeMeterTenants,
      deliveries: 0,
    };
  }

  async createMeter(meterData) {
    const { serial_number, location_id, energy_resource_type_id, is_active = true } = meterData;

    const existingMeter = await Meter.findOne({ where: { serial_number } });
    if (existingMeter) throw new Error('Meter with this serial number already exists');

    if (location_id) {
      const location = await Location.findByPk(location_id);
      if (!location) throw new Error('Location not found');
      if (!location.is_active) throw new Error('Cannot create meter with inactive location');
    }

    if (energy_resource_type_id) {
      const energyResourceType = await EnergyResourceType.findByPk(energy_resource_type_id);
      if (!energyResourceType) throw new Error('Energy resource type not found');
      if (!energyResourceType.is_active) throw new Error('Cannot create meter with inactive energy resource type');
    }

    return await Meter.create({
      serial_number,
      location_id,
      energy_resource_type_id,
      is_active,
    });
  }

  async updateMeter(id, updateData) {
    const meter = await this.getMeterById(id);
    const { serial_number, location_id, energy_resource_type_id, is_active } = updateData;

    if (serial_number && serial_number !== meter.serial_number) {
      const existingMeter = await Meter.findOne({
        where: { serial_number, id: { [Op.ne]: id } },
      });
      if (existingMeter) throw new Error('Meter with this serial number already exists');
    }

    if (location_id && location_id !== meter.location_id) {
      const location = await Location.findByPk(location_id);
      if (!location) throw new Error('Location not found');
      if (!location.is_active) throw new Error('Cannot update meter with inactive location');
    }

    if (energy_resource_type_id && energy_resource_type_id !== meter.energy_resource_type_id) {
      const energyResourceType = await EnergyResourceType.findByPk(energy_resource_type_id);
      if (!energyResourceType) throw new Error('Energy resource type not found');
      if (!energyResourceType.is_active) throw new Error('Cannot update meter with inactive energy resource type');
    }

    if (is_active === false && meter.is_active === true) {
      await this.cascadeDeactivateMeter(id);
    }

    return await meter.update({
      ...(serial_number && { serial_number }),
      ...(location_id && { location_id }),
      ...(energy_resource_type_id && { energy_resource_type_id }),
      ...(is_active !== undefined && { is_active }),
    });
  }

  async cascadeDeactivateMeter(id) {
    const transaction = await sequelize.transaction();
    try {
      const meterTenantsCount = await MeterTenant.count({
        where: { meter_id: id, [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: new Date() } }] },
      });

      await MeterTenant.update(
        { assigned_to: new Date() },
        {
          where: {
            meter_id: id,
            [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: new Date() } }],
          },
          transaction,
        }
      );

      await transaction.commit();
      return { deactivated_meter_tenants: meterTenantsCount };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deleteMeter(id) {
    const meter = await this.getMeterById(id);
    if (meter.is_active) throw new Error('Cannot delete active meter. Deactivate it first.');

    await this.cascadeDeleteMeter(id);
    return await meter.destroy();
  }

  async cascadeDeleteMeter(id) {
    const transaction = await sequelize.transaction();
    try {
      const meterTenantsCount = await MeterTenant.count({ where: { meter_id: id } });

      await MeterTenant.destroy({ where: { meter_id: id }, transaction });

      await transaction.commit();
      return {
        deleted_meter_tenants: meterTenantsCount,
        deleted_deliveries: 0,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getAllMeterTenants(filters = {}) {
    const where = {};
    if (filters.meter_id) where.meter_id = filters.meter_id;
    if (filters.tenant_id) where.tenant_id = filters.tenant_id;

    if (filters.active_only === 'true') {
      where[Op.or] = [{ assigned_to: null }, { assigned_to: { [Op.gte]: new Date() } }];
    }

    return await MeterTenant.findAll({
      where,
      include: [
        {
          model: Meter,
          as: 'Meter',
          include: [
            { model: Location, as: 'Location' },
            { model: EnergyResourceType, as: 'EnergyResourceType' },
          ],
        },
        { model: Tenant, as: 'Tenant' },
      ],
      order: [['assigned_from', 'DESC']],
    });
  }

  async createMeterTenant(meterTenantData) {
    const { meter_id, tenant_id, assigned_from, assigned_to } = meterTenantData;

    const meter = await Meter.findByPk(meter_id, {
      include: [
        { model: Location, as: 'Location' },
        { model: EnergyResourceType, as: 'EnergyResourceType' },
      ],
    });
    if (!meter) throw new Error('Meter not found');
    if (!meter.is_active) throw new Error('Cannot assign inactive meter');
    if (!meter.Location) throw new Error('Location not found');
    if (!meter.Location.is_active) throw new Error('Cannot assign meter with inactive location');
    if (!meter.EnergyResourceType) throw new Error('Energy resource type not found');
    if (!meter.EnergyResourceType.is_active) throw new Error('Cannot assign meter with inactive energy resource type');

    const tenant = await Tenant.findByPk(tenant_id);
    if (!tenant) throw new Error('Tenant not found');
    if (!tenant.is_active) throw new Error('Cannot assign to inactive tenant');

    return await MeterTenant.create({
      meter_id,
      tenant_id,
      assigned_from,
      assigned_to,
    });
  }

  async updateMeterTenant(id, updateData) {
    const meterTenant = await MeterTenant.findByPk(id);
    if (!meterTenant) throw new Error('Meter tenant assignment not found');

    const { meter_id, tenant_id, assigned_from, assigned_to } = updateData;

    if (meter_id && meter_id !== meterTenant.meter_id) {
      const meter = await Meter.findByPk(meter_id, {
        include: [
          { model: Location, as: 'Location' },
          { model: EnergyResourceType, as: 'EnergyResourceType' },
        ],
      });
      if (!meter) throw new Error('Meter not found');
      if (!meter.is_active) throw new Error('Cannot assign inactive meter');
      if (!meter.Location) throw new Error('Location not found');
      if (!meter.Location.is_active) throw new Error('Cannot assign meter with inactive location');
      if (!meter.EnergyResourceType) throw new Error('Energy resource type not found');
      if (!meter.EnergyResourceType.is_active) throw new Error('Cannot assign meter with inactive energy resource type');
    }

    if (tenant_id && tenant_id !== meterTenant.tenant_id) {
      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) throw new Error('Tenant not found');
      if (!tenant.is_active) throw new Error('Cannot assign to inactive tenant');
    }

    if (meter_id && tenant_id && (meter_id !== meterTenant.meter_id || tenant_id !== meterTenant.tenant_id)) {
      const overlappingAssignment = await MeterTenant.findOne({
        where: {
          meter_id,
          tenant_id,
          id: { [Op.ne]: id },
          [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: assigned_from || meterTenant.assigned_from } }],
        },
      });
      if (overlappingAssignment) throw new Error('Overlapping meter tenant assignment exists');
    }

    return await meterTenant.update({
      ...(meter_id && { meter_id }),
      ...(tenant_id && { tenant_id }),
      ...(assigned_from && { assigned_from }),
      ...(assigned_to && { assigned_to }),
    });
  }

  async deleteMeterTenant(id) {
    const meterTenant = await MeterTenant.findByPk(id);
    if (!meterTenant) throw new Error('Meter tenant assignment not found');
    return await meterTenant.destroy();
  }
}

module.exports = new MeterService();