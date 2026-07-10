'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MeterReading extends Model {
    static associate(models) {
      this.belongsTo(models.MeterTenant, { as: 'MeterTenant', foreignKey: 'meter_tenant_id' });
      this.belongsTo(models.User, { foreignKey: 'created_by' });
      this.hasMany(models.MeterReadingDistribution, {
        foreignKey: 'meter_reading_id',
        as: 'distributions',
      });
    }
  }
  MeterReading.init(
    {
      meter_tenant_id: { type: DataTypes.INTEGER, allowNull: false },
      reading_date: { type: DataTypes.DATEONLY, allowNull: false },
      current_reading: { type: DataTypes.DECIMAL(12, 4) },
      previous_reading: { type: DataTypes.DECIMAL(12, 4) },
      consumption: { type: DataTypes.DECIMAL(12, 4) },
      direct_consumption: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
      area_based_consumption: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
      total_consumption: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
      total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      calculation_method: { type: DataTypes.STRING(50), allowNull: false },
      calculation_coefficient: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
        defaultValue: 1.0,
        comment: 'Коефіцієнт для розрахунків',
      },
      energy_consumption_coefficient: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
        defaultValue: 1.0,
        comment: 'Розрахунковий коефіцієнт споживання електроенергії',
      },
      rental_area: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Орендована площа, кв.м',
      },
      total_rented_area_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Відсоток орендованої площі',
      },
      notes: { type: DataTypes.TEXT },
      act_number: { type: DataTypes.STRING(100) },
      executor_name: { type: DataTypes.STRING(255) },
      tenant_representative: { type: DataTypes.STRING(255) },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      created_by: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: 'MeterReading',
      tableName: 'meter_readings',
      timestamps: false,
    }
  );
  return MeterReading;
};
