'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.MeterReading, { foreignKey: 'created_by' });
    }
  }
  User.init(
    {
      auth0_user_id: { type: DataTypes.STRING(255), allowNull: false },
      full_name: { type: DataTypes.STRING(255), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } }, 
      role: { type: DataTypes.STRING(50), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: false,
    }
  );
  return User;
};
