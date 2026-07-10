'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) {
      this.belongsTo(models.Location, { foreignKey: 'location_id' });
      this.belongsTo(models.ResourceConfiguration, { foreignKey: 'resource_type', targetKey: 'resource_type' });
    }
  }
  Resource.init(
    {
      location_id: { type: DataTypes.INTEGER, allowNull: false },
      resource_type: { type: DataTypes.STRING(50), allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
      event_date: { type: DataTypes.DATEONLY, allowNull: false },
      specific_data: { type: DataTypes.JSONB },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'Resource',
      tableName: 'resources',
      timestamps: false,
    }
  );
  return Resource;
};
