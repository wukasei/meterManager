'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenants', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      occupied_area: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      contact_person: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tenants');
  },
};
