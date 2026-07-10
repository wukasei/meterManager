'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('energy_resource_types', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      unit: { type: Sequelize.STRING(20), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('energy_resource_types');
  },
};
