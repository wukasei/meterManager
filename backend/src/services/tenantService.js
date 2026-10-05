const { Tenant, MeterTenant, Location } = require('../../models');
const { Op } = require('sequelize');
const withTransaction = require('../utils/withTransaction');

const TENANT_INCLUDES = [
  { model: MeterTenant, as: 'MeterTenants' },
  { model: Location, as: 'Locations', attributes: ['id', 'name', 'occupied_area'] },
];

// Прив'язує кожну локацію зі списку до орендаря
async function assignLocations(tenantId, locationIds, transaction) {
  await Promise.all(
    locationIds.map((locationId) =>
      Location.update(
        { tenant_id: tenantId },
        { where: { id: locationId }, validate: false, transaction }
      )
    )
  );
}

class TenantService {
  async getAllTenants(filters = {}) {
    const where = {};
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };

    return await Tenant.findAll({
      where,
      include: TENANT_INCLUDES,
      order: [['created_at', 'DESC']],
    });
  }

  async getTenantById(id) {
    return await Tenant.findByPk(id, { include: TENANT_INCLUDES });
  }

  async getSimpleTenants() {
    return await Tenant.findAll({
      attributes: ['id', 'name'],
      where: { is_active: true },
      order: [['name', 'ASC']],
    });
  }

  async getTenantDependencies(id) {
    const activeMeterTenants = await MeterTenant.count({
      where: { tenant_id: id, [Op.or]: [{ assigned_to: null }, { assigned_to: { [Op.gte]: new Date() } }] },
    });
    return { active_meter_tenants: activeMeterTenants };
  }

  async createTenant(tenantData) {
    const { name, location_ids = [], contact_person, phone, email, is_active = true } = tenantData;
 
    const tenantId = await withTransaction(null, async (transaction) => {
      const tenant = await Tenant.create(
        {
          name,
          contact_person,
          phone,
          email,
          is_active,
        },
        { transaction }
      );
 
      if (Array.isArray(location_ids) && location_ids.length > 0) {
        await assignLocations(tenant.id, location_ids, transaction);
      }
 
      return tenant.id;
    });
 
    return await this.getTenantById(tenantId);
  }

  async updateTenant(id, updateData) {
    const tenant = await this.getTenantById(id);
    if (!tenant) throw new Error('Tenant not found');
 
    const { name, location_ids, contact_person, phone, email, is_active } = updateData;
 
    // Оновлення полів, відв'язування старих і прив'язування нових локацій — в одній транзакції
    await withTransaction(null, async (transaction) => {
      await tenant.update(
        {
          ...(name && { name }),
          ...(contact_person !== undefined && { contact_person }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(is_active !== undefined && { is_active }),
        },
        { transaction }
      );
 
      if (Array.isArray(location_ids)) {
        await Location.update(
          { tenant_id: null },
          { where: { tenant_id: tenant.id }, validate: false, transaction }
        );
        await assignLocations(tenant.id, location_ids, transaction);
      }
    });
 
    await tenant.reload({ include: TENANT_INCLUDES });
 
    return tenant;
  }

  async deleteTenant(id) {
    const tenant = await this.getTenantById(id);
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.is_active) throw new Error('Cannot delete active tenant. Deactivate it first.');
 
    // Відв'язування локацій, видалення прив'язок лічильників і орендаря — в одній транзакції
    return withTransaction(null, async (transaction) => {
      await Location.update(
        { tenant_id: null },
        { where: { tenant_id: id }, validate: false, transaction }
      );
      await MeterTenant.destroy({ where: { tenant_id: id }, transaction });
      return tenant.destroy({ transaction });
    });
  }
}

module.exports = new TenantService();