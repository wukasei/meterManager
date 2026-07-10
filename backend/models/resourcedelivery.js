'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ResourceDelivery extends Model {
    static associate(models) {
      this.belongsTo(models.Location, { foreignKey: 'location_id', as: 'location' });
      this.belongsTo(models.EnergyResourceType, { foreignKey: 'energy_resource_type_id', as: 'energyResourceType' });
    }
  }

  ResourceDelivery.init(
    {
      location_id: { type: DataTypes.INTEGER, allowNull: false },
      energy_resource_type_id: { type: DataTypes.INTEGER, allowNull: false },
      delivery_date: { type: DataTypes.DATEONLY, allowNull: false },
      quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
      unit: { type: DataTypes.STRING(20), allowNull: false },
      price_per_unit: { type: DataTypes.DECIMAL(10, 4) },
      total_cost: { type: DataTypes.DECIMAL(12, 2) },
      supplier: { type: DataTypes.STRING(255) },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'ResourceDelivery',
      tableName: 'resource_deliveries',
      timestamps: false,
    }
  );
  return ResourceDelivery;
};
