'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('meter_reading_distributions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      meter_reading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'meter_readings', key: 'id' },
        onDelete: 'CASCADE',
      },
      category: {
        type: Sequelize.ENUM('CA', 'CP', 'GR'),
        allowNull: false,
        comment: 'Тип підкатегорії: СА, СР або ГР',
      },
      current_reading: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true,
      },
      previous_reading: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true,
      },
      difference: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true,
      },
      calculation_coefficient: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
        defaultValue: 1.0,
      },
      area_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 100.0,
      },
      consumed_energy: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down (queryInterface) {
    await queryInterface.dropTable('meter_reading_distributions');
  }
};
