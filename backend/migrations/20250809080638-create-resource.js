'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('resources', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: { model: 'resource_configurations', key: 'resource_type' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      specific_data: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('resources');
  },
};
