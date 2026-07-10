'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tariffs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      energy_resource_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'energy_resource_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      price: { type: Sequelize.DECIMAL(10, 4), allowNull: false },
      valid_from: { type: Sequelize.DATEONLY, allowNull: false },
      valid_to: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tariffs');
  },
};
