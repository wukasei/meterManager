'use strict';
const meterTenantService = require('../services/meterTenantService');

const mapErrorToStatus = (error) => {
  // Порівнюємо без урахування регістру
  const message = error.message.toLowerCase();

  if (message.includes('not found')) return 404;
  if (message.includes('already assigned') || message.includes('overlap')) return 409;
  if (
    error.name === 'SequelizeValidationError' ||
    message.includes('invalid') ||
    message.includes('inactive') ||
    message.includes('cannot be later') ||
    message.includes('required')
  ) {
    return 400;
  }

  return 500;
};

const sendErrorResponse = (res, error) => {
  const statusCode = mapErrorToStatus(error);
  const clientMessage = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    errors: error.errors
  });
};

const getAllMeterTenants = async (req, res) => {
  try {
    const filters = {};
    ['tenant_id', 'meter_id', 'assigned_from', 'assigned_to'].forEach((key) => {
      if (req.query[key] !== undefined && req.query[key] !== '') {
        filters[key] = req.query[key];
      }
    });

    // "Лише чинні" = прив'язки, що діють сьогодні. Явно задані дати мають пріоритет
    if (req.query.active_only === 'true' && !filters.assigned_from && !filters.assigned_to) {
      const today = new Date().toISOString().split('T')[0];
      filters.assigned_from = today;
      filters.assigned_to = today;
    }

    const meterTenants = await meterTenantService.getAllMeterTenants(filters);

    res.status(200).json({
      success: true,
      data: meterTenants,
      count: meterTenants.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createMeterTenant = async (req, res) => {
  try {
    const meterTenant = await meterTenantService.createMeterTenant(req.body);

    res.status(201).json({
      success: true,
      message: 'MeterTenant created successfully',
      data: meterTenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateMeterTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const meterTenant = await meterTenantService.updateMeterTenant(id, req.body);

    res.status(200).json({
      success: true,
      message: 'MeterTenant updated successfully',
      data: meterTenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteMeterTenant = async (req, res) => {
  try {
    const { id } = req.params;
    await meterTenantService.deleteMeterTenant(id);

    res.status(200).json({
      success: true,
      message: 'MeterTenant deleted successfully',
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllMeterTenants,
  createMeterTenant,
  updateMeterTenant,
  deleteMeterTenant,
};
