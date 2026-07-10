const { ResourceDelivery, EnergyResourceType, Location } = require('../../models');
const { Op } = require('sequelize');

class ResourceDeliveryService {
  async getAllDeliveries(filters = {}) {
    const where = {};

    if (filters.location_id) {
      where.location_id = filters.location_id;
    }

    if (filters.energy_resource_type_id) {
      where.energy_resource_type_id = filters.energy_resource_type_id;
    }

    if (filters.delivery_date) {
      where.delivery_date = filters.delivery_date;
    }

    const limit = parseInt(filters.limit) || 10;
    const page = parseInt(filters.page) || 1;

    const result = await ResourceDelivery.findAndCountAll({
      where,
      include: [
        { model: Location, as: 'location', attributes: ['id', 'name'] },
        { model: EnergyResourceType, as: 'energyResourceType', attributes: ['id', 'name', 'unit'] },
      ],
      order: [['delivery_date', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: result.rows,
      count: result.count,
    };
  }

  async getDeliveryById(id) {
    return await ResourceDelivery.findByPk(id, {
      include: [
        { model: Location, as: 'location', attributes: ['id', 'name'] },
        { model: EnergyResourceType, as: 'energyResourceType', attributes: ['id', 'name', 'unit'] },
      ],
    });
  }

  async createResourceDelivery(data) {
    const {
      location_id,
      energy_resource_type_id,
      delivery_date,
      quantity,
      unit,
      price_per_unit,
      total_cost,
      supplier,
    } = data;

    if (!location_id || !energy_resource_type_id || !delivery_date || !quantity || !unit) {
      throw new Error('Required fields missing');
    }

    const location = await Location.findByPk(location_id);
    if (!location) throw new Error('Location not found');
    if (!location.is_active) throw new Error('Cannot create delivery - location is inactive');

    const energyResourceType = await EnergyResourceType.findByPk(energy_resource_type_id);
    if (!energyResourceType) throw new Error('Energy resource type not found');
    if (!energyResourceType.is_active) throw new Error('Cannot create delivery - energy resource type is inactive');

    const existing = await ResourceDelivery.findOne({
      where: { location_id, energy_resource_type_id, delivery_date },
    });
    if (existing) {
      throw new Error('Delivery for this location, resource type, and date already exists');
    }

    return await ResourceDelivery.create({
      location_id,
      energy_resource_type_id,
      delivery_date,
      quantity,
      unit,
      price_per_unit,
      total_cost,
      supplier,
    });
  }

  async updateResourceDelivery(id, updateData) {
    const delivery = await ResourceDelivery.findByPk(id);
    if (!delivery) throw new Error('Delivery not found');

    if (updateData.location_id && updateData.location_id !== delivery.location_id) {
      const location = await Location.findByPk(updateData.location_id);
      if (!location) throw new Error('Location not found');
      if (!location.is_active) throw new Error('Cannot update delivery - location is inactive');
    }

    if (updateData.energy_resource_type_id && updateData.energy_resource_type_id !== delivery.energy_resource_type_id) {
      const energyResourceType = await EnergyResourceType.findByPk(updateData.energy_resource_type_id);
      if (!energyResourceType) throw new Error('Energy resource type not found');
      if (!energyResourceType.is_active) throw new Error('Cannot update delivery - energy resource type is inactive');
    }

    if (updateData.location_id || updateData.energy_resource_type_id || updateData.delivery_date) {
      const existing = await ResourceDelivery.findOne({
        where: {
          location_id: updateData.location_id || delivery.location_id,
          energy_resource_type_id: updateData.energy_resource_type_id || delivery.energy_resource_type_id,
          delivery_date: updateData.delivery_date || delivery.delivery_date,
          id: { [Op.ne]: id },
        },
      });
      if (existing) {
        throw new Error('Another delivery for this location, resource type and date already exists');
      }
    }

    return await delivery.update(updateData);
  }

  async deleteResourceDelivery(id) {
    const delivery = await ResourceDelivery.findByPk(id);
    if (!delivery) throw new Error('Delivery not found');

    return await delivery.destroy();
  }
}

module.exports = new ResourceDeliveryService();
