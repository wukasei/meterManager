'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MeterReadingDistribution extends Model {
    static associate(models) {
      this.belongsTo(models.MeterReading, {
        foreignKey: 'meter_reading_id',
        as: 'MeterReading',
        onDelete: 'CASCADE',
      });
    }
  }

  MeterReadingDistribution.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      meter_reading_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'meter_readings', key: 'id' },
        onDelete: 'CASCADE',
      },
      category: {
        type: DataTypes.ENUM('CA', 'CP', 'GR'),
        allowNull: false,
        comment: 'Тип підкатегорії: СА, СР або ГР',
      },
      current_reading: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      previous_reading: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      difference: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      calculation_coefficient: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
        defaultValue: 1.0,
      },
      area_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      consumed_energy: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      cost: { 
        type: DataTypes.DECIMAL(12, 2), 
        allowNull: true,
        defaultValue: 0,
    },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      modelName: 'MeterReadingDistribution',
      tableName: 'meter_reading_distributions',
      timestamps: false,
    }
  );

  return MeterReadingDistribution;
};
