'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meters', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      serial_number: { type: Sequelize.STRING(100), unique: true, allowNull: false },
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
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('meters');
  },
};
