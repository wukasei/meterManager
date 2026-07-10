'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      auth0_user_id: { type: Sequelize.STRING(255), unique: true, allowNull: false },
      full_name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true }, 
      role: { type: Sequelize.STRING(50), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
