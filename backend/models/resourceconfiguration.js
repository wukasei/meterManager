'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ResourceConfiguration extends Model {
    static associate(models) {
      this.hasMany(models.Resource, { foreignKey: 'resource_type', sourceKey: 'resource_type' });
    }
  }
  ResourceConfiguration.init(
    {
      resource_type: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      display_name: { type: DataTypes.STRING(100), allowNull: false },
      required_fields: { type: DataTypes.JSONB, allowNull: false },
      optional_fields: { type: DataTypes.JSONB },
      validation_rules: { type: DataTypes.JSONB },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ResourceConfiguration',
      tableName: 'resource_configurations',
      timestamps: false,
    }
  );
  return ResourceConfiguration;
};
