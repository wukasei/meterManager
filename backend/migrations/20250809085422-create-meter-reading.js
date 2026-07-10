'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meter_readings', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      meter_tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'meter_tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reading_date: { type: Sequelize.DATEONLY, allowNull: false },
      current_reading: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      consumption: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      unit_price: { type: Sequelize.DECIMAL(10, 4), allowNull: false },
      direct_consumption: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      area_based_consumption: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      total_consumption: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      total_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      calculation_method: { type: Sequelize.STRING(50), allowNull: false },
      executor_name: { type: Sequelize.STRING(255), allowNull: true },
      tenant_representative: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('meter_readings');
  },
};
