'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EnergyResourceType extends Model {
    static associate(models) {
      this.hasMany(models.Meter, { foreignKey: 'energy_resource_type_id' });
      this.hasMany(models.Tariff, { foreignKey: 'energy_resource_type_id' });
      this.hasMany(models.ResourceDelivery, { foreignKey: 'energy_resource_type_id', as: 'resourceDeliveries' });
    }
  }
  EnergyResourceType.init(
    {
      name: { type: DataTypes.STRING(100), allowNull: false },
      unit: { type: DataTypes.STRING(20), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'EnergyResourceType',
      tableName: 'energy_resource_types',
      timestamps: false,
    }
  );
  return EnergyResourceType;
};
