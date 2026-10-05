const { EnergyResourceType, Meter, ResourceDelivery, MeterTenant } = require('../../models');
const { Op } = require('sequelize');
const withTransaction = require('../utils/withTransaction');

class EnergyResourceTypeService {
  async getAllResourceTypes(filters = {}) {
    const where = {};
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };

    return await EnergyResourceType.findAll({
      where,
      order: [['name', 'ASC']],
    });
  }

  async getResourceTypeById(id) {
    const type = await EnergyResourceType.findByPk(id);
    if (!type) throw new Error('Resource type not found');
    return type;
  }

  async getResourceTypeDependencies(id) {
    const activeMeters = await Meter.count({
      where: { energy_resource_type_id: id, is_active: true },
    });
    const deliveries = await ResourceDelivery.count({
      where: { energy_resource_type_id: id },
    });
    return { active_meters: activeMeters, deliveries: deliveries };
  }

  async createResourceType(data) {
    const { name, unit, is_active = true } = data;
    if (!name || !unit) throw new Error('Name and unit are required');

    const existingType = await EnergyResourceType.findOne({ where: { name } });
    if (existingType) throw new Error('Resource type with this name already exists');

    return await EnergyResourceType.create({
      name,
      unit,
      is_active,
    });
  }

  async updateResourceType(id, updateData) {
    const type = await this.getResourceTypeById(id);
    const { name, unit, is_active } = updateData;

    if (name && name !== type.name) {
      const existingType = await EnergyResourceType.findOne({
        where: { name, id: { [Op.ne]: id } },
      });
      if (existingType) throw new Error('Resource type with this name already exists');
    }
    return withTransaction(null, async (transaction) => {
      if (is_active === false && type.is_active === true) {
        await this.cascadeDeactivateResourceType(id, transaction);
      }
 
      return type.update(
        {
          ...(name && { name }),
          ...(unit !== undefined && { unit }),
          ...(is_active !== undefined && { is_active }),
        },
        { transaction }
      );
    }); 
  }

  async cascadeDeactivateResourceType(id, externalTransaction = null) {
    return withTransaction(externalTransaction, async (transaction) => {
      const metersCount = await Meter.count({
        where: { energy_resource_type_id: id, is_active: true },
        transaction,
      });
 
      await Meter.update(
        { is_active: false },
        {
          where: { energy_resource_type_id: id, is_active: true },
          transaction,
        }
      );
 
      return { deactivated_meters: metersCount };
    });
  }

  async deleteResourceType(id) {
    const type = await this.getResourceTypeById(id);
    if (type.is_active) throw new Error('Cannot delete active resource type. Deactivate it first.');

    return withTransaction(null, async (transaction) => {
      await this.cascadeDeleteResourceType(id, transaction);
      return type.destroy({ transaction });
    });
  }

  async cascadeDeleteResourceType(id, externalTransaction = null) {
    return withTransaction(externalTransaction, async (transaction) => {
      const meters = await Meter.findAll({
        where: { energy_resource_type_id: id },
        attributes: ['id'],
        transaction,
      });
      const meterIds = meters.map((meter) => meter.id);
      const meterTenantsCount =
        meterIds.length > 0
          ? await MeterTenant.count({ where: { meter_id: { [Op.in]: meterIds } }, transaction })
          : 0;
      const deliveriesCount = await ResourceDelivery.count({
        where: { energy_resource_type_id: id },
        transaction,
      });
 
      if (meterIds.length > 0) {
        await MeterTenant.destroy({ where: { meter_id: { [Op.in]: meterIds } }, transaction });
      }
      await Meter.destroy({ where: { energy_resource_type_id: id }, transaction });
      await ResourceDelivery.destroy({ where: { energy_resource_type_id: id }, transaction });
 
      return {
        deleted_meters: meterIds.length,
        deleted_meter_tenants: meterTenantsCount,
        deleted_deliveries: deliveriesCount,
      };
    });
  }
}


module.exports = new EnergyResourceTypeService();