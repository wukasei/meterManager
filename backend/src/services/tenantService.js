const { Tenant, MeterTenant, Location } = require('../../models');
const { Op } = require('sequelize');

class TenantService {
  async getAllTenants(filters = {}) {
    const where = {};
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.name) where.name = { [Op.iLike]: `%${filters.name}%` };

    return await Tenant.findAll({
      where,
      include: [
        { model: MeterTenant, as: 'MeterTenants' },
        {
          model: Location,
          as: 'Locations',
          attributes: ['id', 'name', 'occupied_area']
        }
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async getTenantById(id) {
    return await Tenant.findByPk(id, {
      include: [
        { model: MeterTenant, as: 'MeterTenants' },
        {
          model: Location,
          as: 'Locations',
          attributes: ['id', 'name', 'occupied_area']
        }
      ],
    });
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

    const tenant = await Tenant.create({
      name,
      contact_person,
      phone,
      email,
      is_active,
    });

    if (Array.isArray(location_ids) && location_ids.length > 0) {
      await Promise.all(location_ids.map(id =>
        Location.update(
          { tenant_id: tenant.id },
          { where: { id }, validate: false }
        )
      ));
    }

    return await this.getTenantById(tenant.id);
  }

  async updateTenant(id, updateData) {
    const tenant = await this.getTenantById(id);
    const { name, location_ids, contact_person, phone, email, is_active } = updateData;
    await tenant.update({
      ...(name && { name }),
      ...(contact_person !== undefined && { contact_person }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(is_active !== undefined && { is_active }),
    });

    if (Array.isArray(location_ids)) {
      await Location.update(
        { tenant_id: null },
        { where: { tenant_id: tenant.id }, validate: false }
      );

      await Promise.all(location_ids.map(id =>
        Location.update(
          { tenant_id: tenant.id },
          { where: { id }, validate: false }
        )
      ));
    }
    await tenant.reload({
      include: [
        { model: Location, as: 'Locations', attributes: ['id', 'name', 'occupied_area'] },
        { model: MeterTenant, as: 'MeterTenants' }
      ]
    });

    return tenant;
  }

  async deleteTenant(id) {
    const tenant = await this.getTenantById(id);
    if (tenant.is_active) throw new Error('Cannot delete active tenant. Deactivate it first.');

    await Location.update(
      { tenant_id: null },
      { where: { tenant_id: id }, validate: false }
    );


    await MeterTenant.destroy({ where: { tenant_id: id } });
    return await tenant.destroy();
  }
}

module.exports = new TenantService();