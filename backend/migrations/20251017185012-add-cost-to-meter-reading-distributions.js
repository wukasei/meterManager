'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('meter_reading_distributions', 'cost', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
      defaultValue: 0,
      after: 'consumed_energy'
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('meter_reading_distributions', 'cost');
  }
};
