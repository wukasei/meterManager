'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      this.hasMany(models.Location, { as: 'Locations', foreignKey: 'tenant_id' }); // ✅ hasMany with plural
      this.hasMany(models.MeterTenant, { as: 'MeterTenants', foreignKey: 'tenant_id' }); // ✅ Added alias
    }
  }

  Tenant.init(
    {
      name: { type: DataTypes.STRING(255), allowNull: false },
      contact_person: { type: DataTypes.STRING(255) },
      phone: { type: DataTypes.STRING(50) },
      email: { type: DataTypes.STRING(255) },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Tenant',
      tableName: 'tenants',
      timestamps: false,
    }
  );

  return Tenant;
};