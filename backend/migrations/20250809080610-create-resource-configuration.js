'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('resource_configurations', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      resource_type: { type: Sequelize.STRING(50), unique: true, allowNull: false },
      display_name: { type: Sequelize.STRING(100), allowNull: false },
      required_fields: { type: Sequelize.JSONB, allowNull: false },
      optional_fields: { type: Sequelize.JSONB, allowNull: true },
      validation_rules: { type: Sequelize.JSONB, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('resource_configurations');
  },
};
