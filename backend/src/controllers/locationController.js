'use strict';
const locationService = require('../services/locationService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('Invalid') || errorMessage.includes('Cannot delete active')) return 400;
  if (errorMessage.includes('already exists')) return 409;
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

const getAllLocations = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active,
      name: req.query.name,
    };

    const locations = await locationService.getAllLocations(filters);

    res.status(200).json({
      // Явне 200 OK
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await locationService.getLocationById(id);

    if (!location) {
      throw new Error('Location not found');
    }

    res.status(200).json({ success: true, data: location });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLocationDependencies = async (req, res) => {
  try {
    const { id } = req.params;
    const dependencies = await locationService.getLocationDependencies(id);

    const message =
      dependencies.active_meters > 0
        ? `This location has ${dependencies.active_meters} active meters that will be deactivated`
        : 'No active dependent objects';

    res.status(200).json({ success: true, data: dependencies, message });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createLocation = async (req, res) => {
  try {
    const location = await locationService.createLocation(req.body);
    res.status(201).json({ success: true, message: 'Location created successfully', data: location });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await locationService.updateLocation(id, req.body);

    let message = 'Location updated successfully';
    if (req.body.is_active === false) {
      const dependencies = await locationService.getLocationDependencies(id);
      if (dependencies.active_meters === 0 && dependencies.deliveries === 0) {
        message += ' (no dependent objects affected)';
      } else {
        message += ` (deactivated ${dependencies.active_meters || 0} meters)`;
      }
    }

    res.status(200).json({ success: true, message, data: location });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    await locationService.deleteLocation(id);

    res.status(200).json({ success: true, message: 'Location deleted permanently' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const assignTenant = async (req, res) => {
  try {
    const { locationId, tenantId } = req.params;
    const location = await locationService.assignTenant(locationId, tenantId);

    res.status(200).json({
      success: true,
      message: `Location ${locationId} successfully assigned to Tenant ${tenantId}`,
      data: location,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const unassignTenant = async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await locationService.unassignTenant(locationId);

    res.status(200).json({
      success: true,
      message: `Location ${locationId} successfully unassigned from tenant`,
      data: location,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  getLocationDependencies,
  createLocation,
  updateLocation,
  deleteLocation,
  assignTenant,
  unassignTenant,
};
