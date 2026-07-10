'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('meter_readings', 'previous_reading', {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
      comment: 'Попередні показники лічильника'
    });

    await queryInterface.addColumn('meter_readings', 'rental_area', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Орендована площа, кв.м'
    });

    await queryInterface.addColumn('meter_readings', 'total_rented_area_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Відсоток орендованої площі'
    });

    await queryInterface.addColumn('meter_readings', 'energy_consumption_coefficient', {
      type: Sequelize.DECIMAL(8, 4),
      allowNull: true,
      defaultValue: 1.0000,
      comment: 'Розрахунковий коефіцієнт споживання електроенергії'
    });

    await queryInterface.addColumn('meter_readings', 'calculation_coefficient', {
      type: Sequelize.DECIMAL(8, 4),
      allowNull: true,
      defaultValue: 1.0000,
      comment: 'Коефіцієнт для розрахунків'
    });

    await queryInterface.addColumn('meter_readings', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Примітки'
    });

    await queryInterface.addColumn('meter_readings', 'act_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Номер акту'
    });

    await queryInterface.sequelize.query(`
      UPDATE meter_readings 
      SET 
        rental_area = 0,
        total_rented_area_percentage = 0,
        energy_consumption_coefficient = 1.0000,
        calculation_coefficient = 1.0000
      WHERE 
        rental_area IS NULL 
        OR total_rented_area_percentage IS NULL 
        OR energy_consumption_coefficient IS NULL 
        OR calculation_coefficient IS NULL
    `);

    await queryInterface.addIndex('meter_readings', ['act_number'], {
      name: 'idx_meter_readings_act_number'
    });

    await queryInterface.addIndex('meter_readings', ['meter_tenant_id', 'reading_date'], {
      name: 'idx_meter_readings_tenant_date'
    });
  },

  async down (queryInterface) {
     await queryInterface.removeIndex('meter_readings', 'idx_meter_readings_act_number');
     await queryInterface.removeIndex('meter_readings', 'idx_meter_readings_tenant_date');
     await queryInterface.removeColumn('meter_readings', 'act_number');
     await queryInterface.removeColumn('meter_readings', 'notes');
     await queryInterface.removeColumn('meter_readings', 'calculation_coefficient');
     await queryInterface.removeColumn('meter_readings', 'energy_consumption_coefficient');
     await queryInterface.removeColumn('meter_readings', 'total_rented_area_percentage');
     await queryInterface.removeColumn('meter_readings', 'rental_area');
     await queryInterface.removeColumn('meter_readings', 'previous_reading');
  }
};
