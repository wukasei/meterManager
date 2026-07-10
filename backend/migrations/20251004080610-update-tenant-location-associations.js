'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('locations', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.sequelize.query(`
      UPDATE locations l
      SET tenant_id = t.id
      FROM tenants t
      WHERE l.id = t.location_id
    `);
    await queryInterface.removeColumn('tenants', 'location_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'location_id', {
      type: Sequelize.INTEGER,
      allowNull: true, 
      references: { model: 'locations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    await queryInterface.sequelize.query(`
      UPDATE tenants t
      SET location_id = l.id
      FROM locations l
      WHERE t.id = l.tenant_id
    `);

    await queryInterface.removeColumn('locations', 'tenant_id');
  }
};
