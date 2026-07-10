'use strict';
const energyResourceTypeService = require('../services/resourceTypeService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('already exists')) return 409;
  if (errorMessage.includes('Cannot delete active') || errorMessage.includes('Invalid')) return 400;
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

const getAllResourceTypes = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active,
      name: req.query.name,
    };

    const types = await energyResourceTypeService.getAllResourceTypes(filters);
    res.status(200).json({
      success: true,
      data: types,
      count: types.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getResourceTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const type = await energyResourceTypeService.getResourceTypeById(id);
    if (!type) throw new Error('Resource type not found');

    res.status(200).json({ success: true, data: type });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getResourceTypeDependencies = async (req, res) => {
  try {
    const { id } = req.params;
    const dependencies = await energyResourceTypeService.getResourceTypeDependencies(id);

    const message =
      dependencies.active_meters > 0 || dependencies.deliveries > 0
        ? `This resource type has ${dependencies.active_meters} active meters and ${dependencies.deliveries} deliveries that will be affected`
        : 'No active dependent objects';

    res.status(200).json({ success: true, data: dependencies, message });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createResourceType = async (req, res) => {
  try {
    const type = await energyResourceTypeService.createResourceType(req.body);
    res.status(201).json({
      success: true,
      message: 'Resource type created successfully',
      data: type,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateResourceType = async (req, res) => {
  try {
    const { id } = req.params;
    const type = await energyResourceTypeService.updateResourceType(id, req.body);

    let message = 'Resource type updated successfully';
    if (req.body.is_active === false) {
      const dependencies = await energyResourceTypeService.getResourceTypeDependencies(id);
      if (dependencies.active_meters === 0) {
        message += ' (no dependent objects affected)';
      } else {
        message += ` (deactivated ${dependencies.active_meters} meters)`;
      }
    }

    res.status(200).json({ success: true, message: message, data: type });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteResourceType = async (req, res) => {
  try {
    const { id } = req.params;
    const dependencies = await energyResourceTypeService.getResourceTypeDependencies(id);
    await energyResourceTypeService.deleteResourceType(id);

    let message = 'Resource type deleted permanently';
    const deletedItems = [];
    if (dependencies.active_meters > 0) deletedItems.push(`${dependencies.active_meters} meters`);
    if (dependencies.deliveries > 0) deletedItems.push(`${dependencies.deliveries} deliveries`);
    if (deletedItems.length > 0) message += ` (also deleted: ${deletedItems.join(', ')})`;

    res.status(200).json({ success: true, message: message });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllResourceTypes,
  getResourceTypeById,
  getResourceTypeDependencies,
  createResourceType,
  updateResourceType,
  deleteResourceType,
};
