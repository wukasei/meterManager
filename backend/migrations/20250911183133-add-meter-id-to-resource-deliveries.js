'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('resource_deliveries', 'meter_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'meters',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' 
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('resource_deliveries', 'meter_id');
  }
};
