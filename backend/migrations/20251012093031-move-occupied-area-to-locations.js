'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('locations', 'occupied_area', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.removeColumn('tenants', 'occupied_area');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'occupied_area', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.removeColumn('locations', 'occupied_area');
  }
};
