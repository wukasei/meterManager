'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tariff extends Model {
    static associate(models) {
      this.belongsTo(models.Location, { foreignKey: 'location_id' });
      this.belongsTo(models.EnergyResourceType, { foreignKey: 'energy_resource_type_id' });
    }
  }
  Tariff.init(
    {
      location_id: { type: DataTypes.INTEGER, allowNull: false },
      energy_resource_type_id: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
      valid_from: { type: DataTypes.DATEONLY, allowNull: false },
      valid_to: { type: DataTypes.DATEONLY, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Tariff',
      tableName: 'tariffs',
      timestamps: false,
    }
  );
  return Tariff;
};
