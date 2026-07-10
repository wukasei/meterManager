'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meter_tenants', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, unique: true },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      meter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'meters', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assigned_from: { type: Sequelize.DATEONLY, allowNull: false },
      assigned_to: { type: Sequelize.DATEONLY, allowNull: true },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('meter_tenants');
  },
};
