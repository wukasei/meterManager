const { User } = require('../../models');
const { Op } = require('sequelize');

const ADMIN_ROLE = 'admin';

function assertAdminUpdateAllowed(user, updateData) {
  if (user.role !== ADMIN_ROLE) return;

  if (updateData.role) {
    throw new Error('Cannot change the role of an admin user');
  }
  if (updateData.is_active === false) {
    throw new Error('Cannot deactivate an admin user');
  }
}

class UserService {
    async getAllUsers(filters = {}) {
    const where = {};

    if (filters.full_name) {
      where.full_name = { [Op.iLike]: `%${filters.full_name}%` };
    }

    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    where.role = { [Op.ne]: ADMIN_ROLE };

    if (filters.role) {
      where.role[Op.eq] = filters.role;
    }

    return await User.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
  }

  async getUserById(id) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUser(id, updateData) {
    const user = await this.getUserById(id);

    assertAdminUpdateAllowed(user, updateData);

    return await user.update({
      ...(updateData.full_name && { full_name: updateData.full_name }),
      ...(updateData.role && { role: updateData.role }),
      ...(updateData.is_active !== undefined && { is_active: updateData.is_active }),
    });
  }

  async deleteUser(id) {
    const user = await this.getUserById(id);
    if (user.role === 'admin') {
      throw new Error('Cannot delete an admin user.');
    }
    return await user.update({ is_active: false });
  }
}

module.exports = new UserService();
