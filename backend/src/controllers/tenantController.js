'use strict';
const tenantService = require('../services/tenantService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('already exists') || errorMessage.includes('assigned')) return 409;
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

const getAllTenants = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active,
      name: req.query.name,
      location_id: req.query.location_id,
    };

    const tenants = await tenantService.getAllTenants(filters);
    res.status(200).json({
      success: true,
      data: tenants,
      count: tenants.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await tenantService.getTenantById(id);
    if (!tenant) throw new Error('Tenant not found');

    res.status(200).json({ success: true, data: tenant });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getTenantDependencies = async (req, res) => {
  try {
    const { id } = req.params;
    const dependencies = await tenantService.getTenantDependencies(id);

    const message =
      dependencies.active_meter_tenants > 0
        ? `Цей орендар має ${dependencies.active_meter_tenants} активних лічильників.`
        : 'Немає активних залежностей';

    res.status(200).json({ success: true, data: dependencies, message });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createTenant = async (req, res) => {
  try {
    const tenant = await tenantService.createTenant(req.body);
    res.status(201).json({
      success: true,
      message: 'Орендаря успішно створено',
      data: tenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await tenantService.updateTenant(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Орендаря успішно оновлено',
      data: tenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    await tenantService.deleteTenant(id);

    res.status(200).json({
      success: true,
      message: 'Орендаря успішно видалено',
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getSimpleTenants = async (req, res) => {
  try {
    const tenants = await tenantService.getSimpleTenants();
    res.status(200).json({
      success: true,
      data: tenants,
      count: tenants.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  getTenantDependencies,
  createTenant,
  updateTenant,
  deleteTenant,
  getSimpleTenants,
};
