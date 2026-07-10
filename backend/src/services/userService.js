const { User } = require('../../models');
const { Op } = require('sequelize');

class UserService {
  async getAllUsers(filters = {}) {
    const where = {};

    if (filters.full_name) {
      where.full_name = { [Op.iLike]: `%${filters.full_name}%` };
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    where.role = { [Op.ne]: 'admin' };

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

    if (user.role === 'admin' && updateData.role) {
      throw new Error('Cannot change the role of an admin user');
    }

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
