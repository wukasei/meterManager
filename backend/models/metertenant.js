'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MeterTenant extends Model {
    static associate(models) {
      this.belongsTo(models.Tenant, { as: 'Tenant', foreignKey: 'tenant_id' });
      this.belongsTo(models.Meter, { as: 'Meter', foreignKey: 'meter_id' });
    }
  }
  MeterTenant.init(
    {
      tenant_id: { type: DataTypes.INTEGER, allowNull: false },
      meter_id: { type: DataTypes.INTEGER, allowNull: false },
      assigned_from: { type: DataTypes.DATEONLY, allowNull: false },
      assigned_to: { type: DataTypes.DATEONLY },
    },
    {
      sequelize,
      modelName: 'MeterTenant',
      tableName: 'meter_tenants',
      timestamps: false,
    }
  );
  return MeterTenant;
};
