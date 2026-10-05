const { ResourceDelivery, EnergyResourceType, Location } = require('../../models');
const { Op } = require('sequelize');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const DELIVERY_INCLUDES = [
  { model: Location, as: 'location', attributes: ['id', 'name'] },
  { model: EnergyResourceType, as: 'energyResourceType', attributes: ['id', 'name', 'unit'] },
];
 
// Перевіряє, що локація існує і активна. action — 'create' або 'update' (для тексту помилки)
async function ensureActiveLocation(locationId, action) {
  const location = await Location.findByPk(locationId);
  if (!location) throw new Error('Location not found');
  if (!location.is_active) throw new Error(`Cannot ${action} delivery - location is inactive`);
  return location;
}
 
// Перевіряє, що тип ресурсу існує і активний
async function ensureActiveResourceType(typeId, action) {
  const type = await EnergyResourceType.findByPk(typeId);
  if (!type) throw new Error('Energy resource type not found');
  if (!type.is_active) throw new Error(`Cannot ${action} delivery - energy resource type is inactive`);
  return type;
}

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

    const parsedLimit = parseInt(filters.limit);
    const parsedPage = parseInt(filters.page);

    const limit = parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : DEFAULT_LIMIT;
    const page = parsedPage > 0 ? parsedPage : 1;

    const result = await ResourceDelivery.findAndCountAll({
      where,
      include: DELIVERY_INCLUDES,
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
    return await ResourceDelivery.findByPk(id, { include: DELIVERY_INCLUDES });
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

    const isQuantityMissing = quantity === undefined || quantity === null;

    if (!location_id || !energy_resource_type_id || !delivery_date || isQuantityMissing || !unit) {
      throw new Error('Required fields missing');
    }

    await ensureActiveLocation(location_id, 'create');
    await ensureActiveResourceType(energy_resource_type_id, 'create');

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
      await ensureActiveLocation(updateData.location_id, 'update');
    }

    if (updateData.energy_resource_type_id && updateData.energy_resource_type_id !== delivery.energy_resource_type_id) {
      await ensureActiveResourceType(updateData.energy_resource_type_id, 'update');
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
