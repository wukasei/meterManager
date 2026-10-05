const { Location, Meter, ResourceDelivery, Tenant, MeterTenant } = require('../../models');
const { Op } = require('sequelize');
const withTransaction = require('../utils/withTransaction');

const LOCATION_INCLUDES = [{ model: Tenant, as: 'Tenant' }];

class LocationService {
  async getAllLocations(filters = {}) {
    try {
      const where = {};
      if (filters.is_active !== undefined) {
        where.is_active = filters.is_active;
      }
      if (filters.name) {
        where.name = {
          [Op.iLike]: `%${filters.name}%`,
        };
      }

      console.log('Fetching locations with where:', where);

      const locations = await Location.findAll({
        where,
        include: LOCATION_INCLUDES,
        order: [['created_at', 'DESC']],
      });

      console.log('Found locations:', locations.length);
      return locations;
    } catch (error) {
      console.error('Error in getAllLocations:', error);
      throw error;
    }
  }

  async getLocationById(id) {
    const location = await Location.findByPk(id, {
      include: LOCATION_INCLUDES,
    });
    if (!location) {
      throw new Error('Location not found');
    }
    return location;
  }

  async createLocation(locationData) {
    const { name, address, tenant_id = null, is_active = true, occupied_area = null } = locationData;

    const existingLocation = await Location.findOne({ where: { name } });
    if (existingLocation) {
      throw new Error('Location with this name already exists');
    }

    if (tenant_id) {
      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) throw new Error('Invalid tenant_id: Tenant not found');
    }

    return await Location.create({
      name,
      address,
      tenant_id,
      is_active,
      occupied_area,
    });
  }

  async updateLocation(id, updateData) {
    const location = await this.getLocationById(id);
    const { name, address, tenant_id, is_active, occupied_area } = updateData;

    if (name && name !== location.name) {
      const existingLocation = await Location.findOne({
        where: { name, id: { [Op.ne]: id } },
      });
      if (existingLocation) throw new Error('Location with this name already exists');
    }

    if (tenant_id !== undefined) {
      if (tenant_id === null) {
        location.tenant_id = null;
      } else {
        const tenant = await Tenant.findByPk(tenant_id);
        if (!tenant) throw new Error('Invalid tenant_id: Tenant not found');
        location.tenant_id = tenant_id;
      }
    }

    return withTransaction(null, async (transaction) => {
      if (is_active === false && location.is_active === true) {
        await this.cascadeDeactivateLocation(id, transaction);
      }
 
      return location.update(
        {
          ...(name && { name }),
          ...(address !== undefined && { address }),
          ...(is_active !== undefined && { is_active }),
          ...(occupied_area !== undefined && { occupied_area }),
          tenant_id: location.tenant_id,
        },
        { transaction }
      );
    });
  }

  async cascadeDeactivateLocation(locationId, externalTransaction = null) {
    return withTransaction(externalTransaction, async (transaction) => {
      const location = await Location.findByPk(locationId, { transaction });
      if (!location) throw new Error('Location not found');
 
      const metersCount = await Meter.count({
        where: { location_id: locationId, is_active: true },
        transaction,
      });
 
      await Meter.update(
        { is_active: false },
        {
          where: { location_id: locationId, is_active: true },
          transaction,
        }
      );
 
      let tenantsCount = 0;
      if (location.tenant_id) {
        const activeLocationsForTenant = await Location.count({
          where: {
            tenant_id: location.tenant_id,
            is_active: true,
            id: { [Op.ne]: locationId },
          },
          transaction,
        });
 
        if (activeLocationsForTenant === 0) {
          // Tenant.update повертає масив [кількість змінених рядків] — беремо перший елемент
          const [updatedTenants] = await Tenant.update(
            { is_active: false },
            {
              where: { id: location.tenant_id, is_active: true },
              transaction,
            }
          );
          tenantsCount = updatedTenants;
        }
      }
 
      return {
        deactivated_meters: metersCount,
        deactivated_tenants: tenantsCount,
      };
    });
  }

  async getLocationDependencies(locationId) {
    const activeMeters = await Meter.count({
      where: { location_id: locationId, is_active: true },
    });

    const deliveries = await ResourceDelivery.count({
      where: { location_id: locationId },
    });

    const activeTenants = await Location.count({
      where: {
        id: locationId,
        tenant_id: { [Op.ne]: null },
      },
      include: [
        {
          model: Tenant,
          as: 'Tenant',
          where: { is_active: true },
          required: true,
        },
      ],
    });

    return {
      active_meters: activeMeters,
      deliveries: deliveries,
      active_tenants: activeTenants,
    };
  }

  async deleteLocation(id) {
    const location = await this.getLocationById(id);

    if (location.is_active) {
      throw new Error('Cannot delete active location. Deactivate it first.');
    }

    return withTransaction(null, async (transaction) => {
      await this.cascadeDeleteLocation(id, transaction);
      return location.destroy({ transaction });
    });
  }

  async cascadeDeleteLocation(locationId, externalTransaction = null) {
 
    return withTransaction(externalTransaction, async (transaction) => {
      const meters = await Meter.findAll({
        where: { location_id: locationId },
        attributes: ['id'],
        transaction,
      });
 
      const meterIds = meters.map((meter) => meter.id);
 
      // Рахуємо ДО видалення: після нього цих записів у базі вже не буде
      const meterTenantsCount =
        meterIds.length > 0
          ? await MeterTenant.count({ where: { meter_id: { [Op.in]: meterIds } }, transaction })
          : 0;
      const deliveriesCount = await ResourceDelivery.count({
        where: { location_id: locationId },
        transaction,
      });
 
      if (meterIds.length > 0) {
        await MeterTenant.destroy({
          where: { meter_id: { [Op.in]: meterIds } },
          transaction,
        });
      }
 
      await ResourceDelivery.destroy({
        where: { location_id: locationId },
        transaction,
      });
 
      await Meter.destroy({
        where: { location_id: locationId },
        transaction,
      });
 
      await Location.update(
        { tenant_id: null },
        {
          where: { id: locationId },
          transaction,
        }
      );
 
      return {
        deleted_meters: meterIds.length,
        deleted_meter_tenants: meterTenantsCount,
        deleted_deliveries: deliveriesCount,
        deleted_tenants: 0,
      };
    });
  }
}

module.exports = new LocationService();
