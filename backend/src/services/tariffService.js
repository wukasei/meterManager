const { Tariff, Location, EnergyResourceType } = require('../../models');
const { Op } = require('sequelize');

class TariffService {
  async getAllTariffs(filters = {}) {
    const where = {};

    if (filters.location_id) {
      where.location_id = filters.location_id;
    }

    if (filters.energy_resource_type_id) {
      where.energy_resource_type_id = filters.energy_resource_type_id;
    }

    if (filters.valid_from) {
      where.valid_from = { [Op.gte]: filters.valid_from };
    }

    if (filters.valid_to) {
      where[Op.or] = [{ valid_to: { [Op.lte]: filters.valid_to } }, { valid_to: null }];
    }

    return await Tariff.findAll({
      where,
      include: [
        { model: Location, attributes: ['id', 'name'] },
        { model: EnergyResourceType, attributes: ['id', 'name', 'unit'] },
      ],
      order: [['valid_from', 'DESC']],
    });
  }

  async getTariffById(id) {
    const tariff = await Tariff.findByPk(id, {
      include: [
        { model: Location, attributes: ['id', 'name'] },
        { model: EnergyResourceType, attributes: ['id', 'name', 'unit'] },
      ],
    });
    if (!tariff) {
      throw new Error('Tariff not found');
    }
    return tariff;
  }

  async createTariff(data) {
    const { location_id, energy_resource_type_id, price, valid_from, valid_to } = data;

    if (!location_id || !energy_resource_type_id || !price || !valid_from) {
      throw new Error('Location, energy resource type, price and valid_from are required');
    }

    const location = await Location.findByPk(location_id);
    if (!location) throw new Error('Location not found');
    if (!location.is_active) throw new Error('Cannot create tariff - location is inactive');

    const energyResourceType = await EnergyResourceType.findByPk(energy_resource_type_id);
    if (!energyResourceType) throw new Error('Energy resource type not found');
    if (!energyResourceType.is_active) throw new Error('Cannot create tariff - energy resource type is inactive');

    const overlappingTariff = await Tariff.findOne({
      where: {
        location_id,
        energy_resource_type_id,
        [Op.or]: [
          {
            valid_from: { [Op.lte]: valid_to || new Date('9999-12-31') },
            valid_to: { [Op.gte]: valid_from },
          },
          { valid_to: null },
        ],
      },
    });

    if (overlappingTariff) {
      throw new Error('Overlapping tariff period exists for this resource and location');
    }

    return await Tariff.create({
      location_id,
      energy_resource_type_id,
      price,
      valid_from,
      valid_to,
    });
  }

  async updateTariff(id, updateData) {
    const tariff = await this.getTariffById(id);

    const { location_id, energy_resource_type_id, price, valid_from, valid_to } = updateData;

    if (location_id && location_id !== tariff.location_id) {
      const location = await Location.findByPk(location_id);
      if (!location) throw new Error('Location not found');
      if (!location.is_active) throw new Error('Cannot update tariff - location is inactive');
    }

    if (energy_resource_type_id && energy_resource_type_id !== tariff.energy_resource_type_id) {
      const energyResourceType = await EnergyResourceType.findByPk(energy_resource_type_id);
      if (!energyResourceType) throw new Error('Energy resource type not found');
      if (!energyResourceType.is_active) throw new Error('Cannot update tariff - energy resource type is inactive');
    }

    if (valid_from || valid_to) {
      const overlappingTariff = await Tariff.findOne({
        where: {
          id: { [Op.ne]: id },
          location_id: location_id || tariff.location_id,
          energy_resource_type_id: energy_resource_type_id || tariff.energy_resource_type_id,
          [Op.or]: [
            {
              valid_from: { [Op.lte]: valid_to || new Date('9999-12-31') },
              valid_to: { [Op.gte]: valid_from || tariff.valid_from },
            },
            { valid_to: null },
          ],
        },
      });

      if (overlappingTariff) {
        throw new Error('Updated period overlaps with existing tariff');
      }
    }

    return await tariff.update({
      ...(location_id && { location_id }),
      ...(energy_resource_type_id && { energy_resource_type_id }),
      ...(price !== undefined && { price }),
      ...(valid_from && { valid_from }),
      ...(valid_to !== undefined && { valid_to }),
    });
  }

  async deleteTariff(id) {
    const tariff = await this.getTariffById(id);
    return await tariff.destroy();
  }
  async getApplicableTariff(location_id, energy_resource_type_id, reading_date) {
    if (!location_id || !energy_resource_type_id) {
      throw new Error("Both location_id and energy_resource_type_id are required");
    }

    const date = new Date(reading_date);
    if (isNaN(date)) {
      throw new Error(`Invalid reading_date: ${reading_date}`);
    }

    const tariff = await Tariff.findOne({
      where: {
        location_id,
        energy_resource_type_id,
        valid_from: { [Op.lte]: date },
        [Op.or]: [
          { valid_to: { [Op.gte]: date } },
          { valid_to: null },
        ],
      },
      order: [['valid_from', 'DESC']],
      include: [
        { model: Location, attributes: ['id', 'name'] },
        { model: EnergyResourceType, attributes: ['id', 'name', 'unit'] },
      ],
    });

    if (!tariff) {
      throw new Error(
        `No applicable tariff found for location ${location_id}, resource ${energy_resource_type_id} on ${reading_date}`
      );
    }

    return tariff;
  }
}
module.exports = new TariffService();