'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Meter extends Model {
    static associate(models) {
      this.belongsTo(models.Location, { as: 'Location', foreignKey: 'location_id' });
      this.belongsTo(models.EnergyResourceType, { foreignKey: 'energy_resource_type_id' });
      this.hasMany(models.MeterTenant, { foreignKey: 'meter_id' });
    }
  }
  Meter.init(
    {
      serial_number: { type: DataTypes.STRING(100), allowNull: false },
      location_id: { type: DataTypes.INTEGER, allowNull: false },
      energy_resource_type_id: { type: DataTypes.INTEGER, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Meter',
      tableName: 'meters',
      timestamps: false,
    }
  );
  return Meter;
};
