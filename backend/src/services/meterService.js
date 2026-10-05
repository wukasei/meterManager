const { Meter, MeterTenant, Tenant, Location, EnergyResourceType } = require('../../models');
const { Op } = require('sequelize');
const withTransaction = require('../utils/withTransaction');

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

    // Закриття прив'язок і оновлення самого лічильника — в одній транзакції
    return withTransaction(null, async (transaction) => {
      if (is_active === false && meter.is_active === true) {
        await this.cascadeDeactivateMeter(id, transaction);
      }

      return meter.update(
        {
          ...(serial_number && { serial_number }),
          ...(location_id && { location_id }),
          ...(energy_resource_type_id && { energy_resource_type_id }),
          ...(is_active !== undefined && { is_active }),
        },
        { transaction }
      );
    });
  }

    async cascadeDeactivateMeter(id, externalTransaction = null) {
    return withTransaction(externalTransaction, async (transaction) => {
      // Одна дата на всю операцію, щоб усі умови порівнювались з тим самим моментом
      const now = new Date();

      // Чинні прив'язки: без дати завершення або з датою завершення в майбутньому
      const activeAssignments = {
        meter_id: id,
        [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: now } }],
      };

      const meterTenantsCount = await MeterTenant.count({ where: activeAssignments, transaction });

      // Ще не почалися — видаляємо: орендар так і не почав користуватися лічильником
      await MeterTenant.destroy({
        where: { ...activeAssignments, assigned_from: { [Op.gt]: now } },
        transaction,
      });

      // Вже почалися — закриваємо сьогоднішньою датою
      await MeterTenant.update(
        { assigned_to: now },
        {
          where: { ...activeAssignments, assigned_from: { [Op.lte]: now } },
          transaction,
        }
      );

      return { deactivated_meter_tenants: meterTenantsCount };
    });
  }

  async deleteMeter(id) {
    const meter = await this.getMeterById(id);
    if (meter.is_active) throw new Error('Cannot delete active meter. Deactivate it first.');

    // Видалення прив'язок і самого лічильника — в одній транзакції
    return withTransaction(null, async (transaction) => {
      await this.cascadeDeleteMeter(id, transaction);
      return meter.destroy({ transaction });
    });
  }

  async cascadeDeleteMeter(id, externalTransaction = null) {
    return withTransaction(externalTransaction, async (transaction) => {
      const meterTenantsCount = await MeterTenant.count({ where: { meter_id: id }, transaction });

      await MeterTenant.destroy({ where: { meter_id: id }, transaction });

      return {
        deleted_meter_tenants: meterTenantsCount,
        deleted_deliveries: 0,
      };
    });
  }
}

module.exports = new MeterService();