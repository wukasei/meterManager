'use strict';
const userService = require('../services/userService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('unique constraint') || errorMessage.includes('already exists')) return 409;
  if (errorMessage.includes('Invalid') || errorMessage.includes('Validation')) return 400;
  return 500;
};

const sendErrorResponse = (res, error) => {
  const statusCode = mapErrorToStatus(error.message);
  const clientMessage = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
};

const getAllUsers = async (req, res) => {
  try {
    const filters = {
      full_name: req.query.full_name,
      role: req.query.role,
      is_active: req.query.is_active,
    };

    const users = await userService.getAllUsers(filters);

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) throw new Error('User not found');

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);

    res.status(200).json({
      success: true,
      message: 'User deleted permanently',
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
