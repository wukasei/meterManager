const { Tariff, Location, EnergyResourceType } = require('../../models');
const { Op } = require('sequelize');

async function findOverlappingTariff({ locationId, typeId, from, to, excludeId }) {
  const where = {
    location_id: locationId,
    energy_resource_type_id: typeId,
    valid_from: { [Op.lte]: to || new Date('9999-12-31') },
    [Op.or]: [{ valid_to: { [Op.gte]: from } }, { valid_to: null }],
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  return Tariff.findOne({ where });
}

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

    const isPriceMissing = price === undefined || price === null;

    if (!location_id || !energy_resource_type_id || isPriceMissing || !valid_from) {
      throw new Error('Location, energy resource type, price and valid_from are required');
    }

    const location = await Location.findByPk(location_id);
    if (!location) throw new Error('Location not found');
    if (!location.is_active) throw new Error('Cannot create tariff - location is inactive');

    const energyResourceType = await EnergyResourceType.findByPk(energy_resource_type_id);
    if (!energyResourceType) throw new Error('Energy resource type not found');
    if (!energyResourceType.is_active) throw new Error('Cannot create tariff - energy resource type is inactive');

    const overlappingTariff = await findOverlappingTariff({
      locationId: location_id,
      typeId: energy_resource_type_id,
      from: valid_from,
      to: valid_to,
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

        // Яким буде тариф ПІСЛЯ оновлення: передане значення або збережене в базі
    const effectiveLocationId = location_id || tariff.location_id;
    const effectiveTypeId = energy_resource_type_id || tariff.energy_resource_type_id;
    const effectiveFrom = valid_from || tariff.valid_from;
    // valid_to: null — це свідоме рішення зробити тариф безстроковим, тому перевіряємо саме undefined
    const effectiveTo = valid_to !== undefined ? valid_to : tariff.valid_to;

    if (effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      throw new Error('valid_to must be after valid_from');
    }

    // Перетин залежить від дат, локації і типу ресурсу — перевіряємо, якщо змінилося будь-що з цього
    const periodOrPlaceChanged =
      valid_from || valid_to !== undefined || location_id || energy_resource_type_id;

    if (periodOrPlaceChanged) {
      const overlappingTariff = await findOverlappingTariff({
        locationId: effectiveLocationId,
        typeId: effectiveTypeId,
        from: effectiveFrom,
        to: effectiveTo,
        excludeId: id,
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
      throw new Error('Invalid: Для цієї локації та типу ресурсу не налаштовано активний Тариф на обрану дату.');
    }

    return tariff;
  }
}
module.exports = new TariffService();